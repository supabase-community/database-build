import { createRequire } from 'module'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import webpack from 'webpack'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_PGLITE_VERSION: await getPackageVersion('@electric-sql/pglite'),
  },
  webpack: (config) => {
    config.resolve = {
      ...config.resolve,
      fallback: {
        fs: false,
        module: false,
        'stream/promises': false,
      },
    }

    // Polyfill `ReadableStream`
    config.plugins.push(
      new webpack.ProvidePlugin({
        ReadableStream: [join(import.meta.dirname, 'polyfills/readable-stream.ts'), 'default'],
      })
    )

    // See https://webpack.js.org/configuration/resolve/#resolvealias
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      'onnxruntime-node$': false,
    }
    return config
  },
  swcMinify: false,
}

export default nextConfig

async function getPackageJson(module) {
  const require = createRequire(import.meta.url)
  const entryPoint = require.resolve(module)
  const [nodeModulePath] = entryPoint.split(module)

  const packagePath = join(nodeModulePath, module, 'package.json')
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'))

  return packageJson
}

async function getPackageVersion(module) {
  const packageJson = await getPackageJson(module)
  return packageJson.version
}
