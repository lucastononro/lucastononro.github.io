#!/usr/bin/env node
// The whole build. Reads posts/ and pages/, writes dist/.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { site, u, abs, categoryCounts } from './site.config.mjs'
import { initHighlighter, renderMarkdown } from './lib/markdown.mjs'
import { loadPosts, groupByTag, tagSlug, parseFrontmatter } from './lib/content.mjs'
import {
  homePage, postPage, listPage, prosePage, notFoundPage, runtime,
} from './lib/templates.mjs'
import { rssFeed, sitemap, robots } from './lib/feed.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(root, 'dist')

async function write(relPath, contents) {
  // A path ending in '/' becomes a directory with index.html, so URLs stay
  // clean without server rewrites.
  const target = relPath.endsWith('/')
    ? path.join(dist, relPath, 'index.html')
    : path.join(dist, relPath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, contents)
  return relPath
}

async function copyStatic() {
  await fs.cp(path.join(root, 'static'), dist, { recursive: true })
  // Tell GitHub Pages not to run Jekyll over the output.
  await fs.writeFile(path.join(dist, '.nojekyll'), '')
}

async function readdirSafe(dir) {
  try { return (await fs.readdir(dir)).sort() } catch { return [] }
}

async function build() {
  const started = process.hrtime.bigint()
  const now = new Date()

  await fs.rm(dist, { recursive: true, force: true })
  await fs.mkdir(dist, { recursive: true })

  await initHighlighter()

  const posts = await loadPosts(path.join(root, 'posts'))
  const tags = groupByTag(posts)
  const filters = categoryCounts(tags)
  const written = []

  runtime.nav = [
    { label: 'Feed', href: '/feed/' },
    { label: 'Skills', href: `/tags/${tagSlug(site.navCategory)}/` },
    { label: 'About', href: '/about/' },
    { label: 'RSS', href: '/feed.xml' },
  ]

  written.push(await write('/', homePage(posts, filters)))

  for (const [i, post] of posts.entries()) {
    written.push(await write(post.href, postPage(post, {
      prev: posts[i - 1] || null, // newer
      next: posts[i + 1] || null, // older
      kicker: post.tags.find((t) => site.categories.includes(t)) || post.tags[0] || '',
    })))
  }

  written.push(await write('/feed/', listPage({
    title: 'Everything',
    label: 'The feed',
    intro: posts.length ? `${posts.length} entries, newest first.` : 'Nothing yet.',
    posts,
    filters,
    canonical: abs('/feed/'),
  })))

  // A page per declared category, whether or not anything is in it yet.
  for (const { slug, count } of filters) {
    const list = tags.get(slug) || []
    written.push(await write(`/tags/${tagSlug(slug)}/`, listPage({
      title: slug,
      label: 'Category',
      intro: count ? `${count} ${count === 1 ? 'entry' : 'entries'}.` : 'Nothing here yet.',
      posts: list,
      canonical: abs(`/tags/${tagSlug(slug)}/`),
    })))
  }

  for (const file of await readdirSafe(path.join(root, 'pages'))) {
    if (!file.endsWith('.md')) continue
    const raw = await fs.readFile(path.join(root, 'pages', file), 'utf8')
    const { data, body } = parseFrontmatter(raw)
    const slug = data.slug || file.replace(/\.md$/, '')
    const { html } = renderMarkdown(body)
    written.push(await write(`/${slug}/`, prosePage({
      title: data.title || slug,
      label: data.label || 'Page',
      description: data.description || '',
      html,
      canonical: abs(`/${slug}/`),
    })))
  }

  await write('/404.html', notFoundPage())
  await write('/feed.xml', rssFeed(posts, now.toUTCString()))
  await write('/sitemap.xml', sitemap(written, now.toISOString().slice(0, 10)))
  await write('/robots.txt', robots())

  await copyStatic()

  const ms = Number(process.hrtime.bigint() - started) / 1e6
  console.log(
    `\n  ${site.title} → dist/\n` +
    `  ${posts.length} posts · ${tags.size} tags · ` +
    `${written.length} pages · ${ms.toFixed(0)} ms\n` +
    `  serving from ${abs('/')}\n`
  )
}

build().catch((err) => {
  console.error(`\n  build failed: ${err.message}\n`)
  console.error(err.stack)
  process.exit(1)
})
