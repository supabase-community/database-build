import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { NextRequest, NextResponse } from 'next/server'
import { createGzip } from 'zlib'
import { Readable } from 'stream'
import { createClient } from '~/utils/supabase/server'
import { createScramSha256Data } from 'pg-gateway'
import { generateDatabasePassword } from '~/utils/generate-database-password'
import { getUncompressedSizeInMB } from '~/utils/get-uncompressed-size-in-mb'

const wildcardDomain = process.env.NEXT_PUBLIC_WILDCARD_DOMAIN ?? 'db.example.com'
const s3Client = new S3Client({ forcePathStyle: true })

export type DatabaseUploadResponse =
  | {
      success: true
      data: {
        username: string
        password?: string
        host: string
        port: number
        databaseName: string
      }
    }
  | {
      success: false
      error: string
    }

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<DatabaseUploadResponse>> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    )
  }

  const data = await req.formData()

  const dump = data.get('dump') as File | null
  const name = data.get('name') as string | null
  const createdAt = data.get('created_at') as string | null

  if (!dump || !name || !createdAt) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing fields',
      },
      { status: 400 }
    )
  }

  if ((await getUncompressedSizeInMB(dump)) > 100) {
    return NextResponse.json(
      {
        success: false,
        error: "You can't deploy a database that is bigger than 100MB",
      },
      { status: 413 }
    )
  }

  const databaseId = params.id
  const key = `dbs/${databaseId}.tar.gz`

  const gzip = createGzip()
  const body = Readable.from(streamToAsyncIterable(dump.stream()))

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: body.pipe(gzip),
    },
  })

  await upload.done()

  const { data: existingDeployedDatabase } = await supabase
    .from('deployed_databases')
    .select('id')
    .eq('database_id', databaseId)
    .maybeSingle()

  let password: string | undefined

  if (existingDeployedDatabase) {
    await supabase
      .from('deployed_databases')
      .update({
        deployed_at: 'now()',
      })
      .eq('database_id', databaseId)
  } else {
    password = generateDatabasePassword()
    await supabase.from('deployed_databases').insert({
      database_id: databaseId,
      name,
      created_at: createdAt,
      auth_method: 'scram-sha-256',
      auth_data: createScramSha256Data(password),
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      username: 'readonly_postgres',
      password,
      host: `${databaseId}.${wildcardDomain}`,
      port: 5432,
      databaseName: 'postgres',
    },
  })
}

async function* streamToAsyncIterable(stream: ReadableStream) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}
