'use client'

import { UntarStream } from '@std/tar/untar-stream'
import { useState } from 'react'
import { useApp } from '~/components/app-provider'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Progress } from '~/components/ui/progress'

import { useQueryClient } from '@tanstack/react-query'
import { Semaphore } from 'async-mutex'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getDatabasesQueryKey } from '~/data/databases/databases-query'
import { DbManager } from '~/lib/db'
import { hasFile, saveFile } from '~/lib/files'
import { useOrigin } from '~/lib/hooks'
import { tarStreamEntryToFile, waitForChunk } from '~/lib/streams'
import { requestFileUpload, stripSuffix } from '~/lib/util'

export default function Page() {
  const { dbManager } = useApp()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<number>()
  const origin = useOrigin()

  return (
    <>
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <Dialog open>
        <DialogContent className="max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Import your databases</DialogTitle>
            <div className="py-2 border-b" />
          </DialogHeader>
          <p>All databases live locally within your browser&apos;s local IndexedDB storage.</p>
          <p>
            You can backup and restore your databases in order to transfer them between browsers or
            devices.
          </p>

          <div className="my-2 border-b" />
          <div className="prose">
            <h4 className="mb-4">How to export and import your databases</h4>
            <ol>
              <li>
                Navigate to <Link href="/export">{origin ?? ''}/export</Link> and click{' '}
                <strong>Export</strong> to download all of your databases into a single tarball.
              </li>
              <li>
                Click <strong>Import</strong> and select the previously exported tarball.
                <br />
                {progress === undefined ? (
                  <Button
                    className="my-2"
                    onClick={async () => {
                      if (!dbManager) {
                        throw new Error('dbManager is not available')
                      }

                      const file = await requestFileUpload()

                      setProgress(0)

                      const metaDb = await dbManager.getMetaDb()

                      const fileStream = file
                        .stream()
                        .pipeThrough(new DecompressionStream('gzip'))
                        .pipeThrough(new UntarStream())

                      // Ensure that we load the meta DB first
                      const [metaDumpEntry, restEntryStream] = await waitForChunk(
                        fileStream,
                        (entry) => entry.path === 'meta.tar.gz'
                      )

                      if (!metaDumpEntry) {
                        throw new Error('Tarball is missing meta database dump')
                      }

                      const metaDump = await tarStreamEntryToFile(metaDumpEntry)

                      // Load the external meta DB temporarily in memory
                      const externalMetaDb = await DbManager.createPGlite({
                        loadDataDir: metaDump,
                      })

                      // Create a temporary DbManager from it
                      // (so that migrations and other checks run)
                      const externalDbManager = new DbManager(externalMetaDb)

                      const databases = await externalDbManager.exportDatabases()
                      const messages = await externalDbManager.exportMessages()

                      try {
                        await metaDb.sql`begin`
                        await dbManager.importDatabases(databases)
                        await dbManager.importMessages(messages)
                        await metaDb.sql`commit`
                      } catch (err) {
                        await metaDb.sql`rollback`
                        throw err
                      }

                      const existingIDBDatabases = await indexedDB.databases()
                      const dbLoadSemaphore = new Semaphore(5)
                      const dbLoadPromises: Promise<void>[] = []

                      for await (const entry of restEntryStream) {
                        // Only handle file entries (vs. directory, etc)
                        if (entry.header.typeflag !== '0') {
                          continue
                        }

                        const pathSegments = entry.path.split('/').filter((v) => !!v)
                        const [rootDir] = pathSegments

                        switch (rootDir) {
                          case 'dbs': {
                            const dump = await tarStreamEntryToFile(entry)
                            const databaseId = stripSuffix(dump.name, '.tar.gz')

                            if (!databaseId) {
                              throw new Error(
                                `Failed to parse database ID from file '${entry.path}'`
                              )
                            }

                            const databaseExists = existingIDBDatabases.some(
                              (db) => db.name === `/pglite/${dbManager.prefix}-${databaseId}`
                            )

                            if (databaseExists) {
                              console.warn(
                                `Database with ID '${databaseId}' already exists, skipping`
                              )
                              setProgress((progress) => (progress ?? 0) + 100 / databases.length)
                              continue
                            }

                            // Limit the number of concurrent loads to avoid excessive RAM use
                            const dbLoadPromise = dbLoadSemaphore.runExclusive(async () => {
                              try {
                                // Load dump into PGlite instance (persists in IndexedDB)
                                await dbManager.getDbInstance(databaseId, dump)
                              } catch (err) {
                                console.warn(`Failed to load database with ID '${databaseId}'`, err)
                              }

                              await dbManager.closeDbInstance(databaseId)
                              setProgress((progress) => (progress ?? 0) + 100 / databases.length)
                            })

                            dbLoadPromises.push(dbLoadPromise)

                            break
                          }
                          case 'files': {
                            const file = await tarStreamEntryToFile(entry)

                            // File ID is captured as the name of the last sub-directory
                            const fileId = pathSegments.at(-2)

                            if (!fileId) {
                              throw new Error(
                                `Failed to parse file ID from file path '${entry.path}'`
                              )
                            }

                            const fileExists = await hasFile(fileId)

                            if (fileExists) {
                              console.warn(`File with ID '${fileId}' already exists, skipping`)
                              continue
                            }

                            await saveFile(fileId, file)
                            break
                          }
                        }
                      }

                      await Promise.all(dbLoadPromises)
                      await queryClient.invalidateQueries({ queryKey: getDatabasesQueryKey() })

                      router.push('/')
                    }}
                  >
                    Import
                  </Button>
                ) : (
                  <div className="flex gap-2 text-xs items-center">
                    <Progress className="my-2 w-[60%]" value={Math.round(progress)} />
                    {Math.round(progress)}%
                  </div>
                )}
              </li>
            </ol>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
