import { PGlite, PGliteInterface } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { mkdir, readFile, access, rm } from 'node:fs/promises'
import net from 'node:net'
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import { extract } from 'tar'
import { PostgresConnection, ScramSha256Data, TlsOptions } from 'pg-gateway'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@postgres-new/supabase'
import { findUp } from 'find-up'
import { env } from './env.js'
import { deleteCache } from './delete-cache.js'
import path from 'node:path'

const supabaseUrl = env.SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY
const s3fsMount = env.S3FS_MOUNT
const wildcardDomain = env.WILDCARD_DOMAIN

const packageLockJsonPath = await findUp('package-lock.json')
if (!packageLockJsonPath) {
  throw new Error('package-lock.json not found')
}
const packageLockJson = JSON.parse(await readFile(packageLockJsonPath, 'utf8')) as {
  packages: {
    'node_modules/@electric-sql/pglite': {
      version: string
    }
  }
}
const pgliteVersion = `(PGlite ${packageLockJson.packages['node_modules/@electric-sql/pglite'].version})`

const dumpDir = `${s3fsMount}/dbs`
const tlsDir = `${s3fsMount}/tls`

await mkdir(dumpDir, { recursive: true })
await mkdir(env.CACHE_PATH, { recursive: true })
await mkdir(tlsDir, { recursive: true })

const tls: TlsOptions = {
  key: await readFile(`${tlsDir}/key.pem`),
  cert: await readFile(`${tlsDir}/cert.pem`),
}

function getIdFromServerName(serverName: string) {
  // The left-most subdomain contains the ID
  // ie. 12345.db.example.com -> 12345
  const [id] = serverName.split('.')
  return id
}

const PostgresErrorCodes = {
  ConnectionException: '08000',
} as const

function sendFatalError(connection: PostgresConnection, code: string, message: string): Error {
  connection.sendError({
    severity: 'FATAL',
    code,
    message,
  })
  connection.socket.end()
  return new Error(message)
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

const server = net.createServer((socket) => {
  let db: PGliteInterface

  deleteCache().catch((err) => {
    console.error(`Error deleting cache: ${err}`)
  })

  const connection = new PostgresConnection(socket, {
    serverVersion: async () => {
      const {
        rows: [{ version }],
      } = await db.query<{ version: string }>(
        `select current_setting('server_version') as version;`
      )
      const serverVersion = `${version} ${pgliteVersion}`
      console.log(serverVersion)
      return serverVersion
    },
    auth: {
      method: 'scram-sha-256',
      async getScramSha256Data(_, { tlsInfo }) {
        if (!tlsInfo?.sniServerName) {
          throw sendFatalError(
            connection,
            PostgresErrorCodes.ConnectionException,
            'sniServerName required in TLS info'
          )
        }

        const databaseId = getIdFromServerName(tlsInfo.sniServerName)
        const { data, error } = await supabase
          .from('deployed_databases')
          .select('auth_method, auth_data')
          .eq('database_id', databaseId)
          .single()

        if (error) {
          throw sendFatalError(
            connection,
            PostgresErrorCodes.ConnectionException,
            `Error getting auth data for database ${databaseId}`
          )
        }

        if (data === null) {
          throw sendFatalError(
            connection,
            PostgresErrorCodes.ConnectionException,
            `Database ${databaseId} not found`
          )
        }

        if (data.auth_method !== 'scram-sha-256') {
          throw sendFatalError(
            connection,
            PostgresErrorCodes.ConnectionException,
            `Unsupported auth method for database ${databaseId}: ${data.auth_method}`
          )
        }

        return data.auth_data as ScramSha256Data
      },
    },
    tls,
    async onTlsUpgrade({ tlsInfo }) {
      if (!tlsInfo?.sniServerName) {
        connection.sendError({
          severity: 'FATAL',
          code: '08000',
          message: `ssl sni extension required`,
        })
        connection.socket.end()
        return
      }

      if (!tlsInfo.sniServerName.endsWith(wildcardDomain)) {
        connection.sendError({
          severity: 'FATAL',
          code: '08000',
          message: `unknown server ${tlsInfo.sniServerName}`,
        })
        connection.socket.end()
        return
      }
    },
    async onAuthenticated({ tlsInfo }) {
      // at this point we know sniServerName is set
      const databaseId = getIdFromServerName(tlsInfo!.sniServerName!)

      console.log(`Serving database '${databaseId}'`)

      const dbPath = path.join(env.CACHE_PATH, databaseId)

      if (!(await fileExists(dbPath))) {
        console.log(`Database '${databaseId}' is not cached, downloading...`)

        const dumpPath = path.join(dumpDir, `${databaseId}.tar.gz`)

        if (!(await fileExists(dumpPath))) {
          connection.sendError({
            severity: 'FATAL',
            code: 'XX000',
            message: `database ${databaseId} not found`,
          })
          connection.socket.end()
          return
        }

        // Create a directory for the database
        await mkdir(dbPath, { recursive: true })

        try {
          // Extract the .tar.gz file
          await pipeline(createReadStream(dumpPath), createGunzip(), extract({ cwd: dbPath }))
        } catch (error) {
          console.error(error)
          await rm(dbPath, { recursive: true, force: true }) // Clean up the partially created directory
          connection.sendError({
            severity: 'FATAL',
            code: 'XX000',
            message: `Error extracting database: ${(error as Error).message}`,
          })
          connection.socket.end()
          return
        }
      }

      db = new PGlite({
        dataDir: dbPath,
        extensions: {
          vector,
        },
      })
      await db.waitReady
      const { rows } = await db.query("SELECT 1 FROM pg_roles WHERE rolname = 'readonly_postgres';")
      if (rows.length === 0) {
        await db.exec(`
          CREATE USER readonly_postgres;
          GRANT pg_read_all_data TO readonly_postgres;
        `)
      }
      await db.close()
      db = new PGlite({
        dataDir: dbPath,
        username: 'readonly_postgres',
        extensions: {
          vector,
        },
      })
      await db.waitReady
    },
    async onMessage(data, { isAuthenticated }) {
      // Only forward messages to PGlite after authentication
      if (!isAuthenticated) {
        return false
      }

      // Forward raw message to PGlite
      try {
        const responseData = await db.execProtocolRaw(data)
        connection.sendData(responseData)
      } catch (err) {
        console.error(err)
      }
      return true
    },
  })

  socket.on('close', async () => {
    console.log('Client disconnected')
    await db?.close()
  })
})

server.listen(5432, async () => {
  console.log('Server listening on port 5432')
})
