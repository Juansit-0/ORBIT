import { fileURLToPath } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

function localApi(): Plugin {
  return {
    name: 'orbit-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const route = url.pathname.match(/^\/api\/([a-z]+)$/)?.[1]
        if (!route) return next()
        try {
          const module = (await server.ssrLoadModule(`/api/${route}.ts`)) as {
            GET?: (request: Request) => Promise<Response>
          }
          if (!module.GET) return next()
          const response = await module.GET(new Request(url))
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch {
          next()
        }
      })
    },
  }
}

function serviceWorkerVersion(): Plugin {
  let outDir = 'dist'
  return {
    name: 'orbit-sw-version',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    async closeBundle() {
      const path = `${outDir}/sw.js`
      const source = await readFile(path, 'utf8').catch(() => null)
      if (source) await writeFile(path, source.replace("'orbit-dev'", `'orbit-${Date.now().toString(36)}'`))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.YOUTUBE_API_KEY) process.env.YOUTUBE_API_KEY = env.YOUTUBE_API_KEY
  return {
    plugins: [localApi(), serviceWorkerVersion()],
    server: { port: 5199 },
    build: {
      rollupOptions: {
        input: {
          landing: fileURLToPath(new URL('./index.html', import.meta.url)),
          app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
        },
      },
    },
    test: {
      include: ['tests/unit/**/*.test.ts'],
      environment: 'node',
      coverage: { include: ['src/core/**', 'src/services/**', 'api/**'], reporter: ['text', 'html'] },
    },
  }
})
