#!/usr/bin/env node
// Dev server: rebuild on change, serve dist/ at the same base path production
// uses, so every link behaves locally exactly as it will on Pages.

import http from 'node:http'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { site } from './site.config.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(root, 'dist')
const port = Number(process.env.PORT || 4321)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

let building = false
let queued = false

function build() {
  if (building) { queued = true; return }
  building = true
  const child = spawn(process.execPath, ['build.mjs'], { cwd: root, stdio: 'inherit' })
  child.on('exit', () => {
    building = false
    if (queued) { queued = false; build() }
  })
}

async function resolve(urlPath) {
  const stripped = urlPath.startsWith(site.base)
    ? urlPath.slice(site.base.length) || '/'
    : urlPath
  const clean = decodeURIComponent(stripped.split('?')[0])
  const candidates = clean.endsWith('/')
    ? [path.join(dist, clean, 'index.html')]
    : [path.join(dist, clean), path.join(dist, `${clean}/index.html`)]

  for (const file of candidates) {
    if (!path.resolve(file).startsWith(dist)) continue
    try {
      const stat = await fs.stat(file)
      if (stat.isFile()) return file
    } catch {}
  }
  return null
}

const server = http.createServer(async (req, res) => {
  const file = await resolve(req.url)
  if (!file) {
    const fallback = path.join(dist, '404.html')
    const body = await fs.readFile(fallback).catch(() => Buffer.from('404'))
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    return res.end(body)
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store',
  })
  res.end(await fs.readFile(file))
})

for (const dir of ['posts', 'pages', 'static', 'lib']) {
  fsSync.watch(path.join(root, dir), { recursive: true }, () => build())
}
for (const file of ['build.mjs', 'site.config.mjs']) {
  fsSync.watch(path.join(root, file), () => build())
}

build()
server.listen(port, () => {
  console.log(`\n  dev  →  http://localhost:${port}${site.base}/\n  watching posts/ pages/ static/ lib/\n`)
})
