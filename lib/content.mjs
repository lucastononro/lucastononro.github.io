// Reading posts off disk: frontmatter, slugs, dates, tags.

import fs from 'node:fs/promises'
import path from 'node:path'
import { renderMarkdown, readingTime } from './markdown.mjs'

/**
 * A deliberately small frontmatter parser. It handles what a blog post needs
 * and nothing more: strings, quoted strings, booleans, and inline `[a, b]`
 * lists. Anything fancier belongs in the post body.
 */
export function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!m) return { data: {}, body: raw }

  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!kv) continue
    const [, key] = kv
    let value = kv[2].trim()

    if (/^\[.*\]$/.test(value)) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
      continue
    }
    value = value.replace(/^['"]|['"]$/g, '')
    if (value === 'true' || value === 'false') data[key] = value === 'true'
    else data[key] = value
  }
  return { data, body: raw.slice(m[0].length) }
}

const FILENAME = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/

export async function loadPosts(dir) {
  let files
  try {
    files = await fs.readdir(dir)
  } catch {
    return []
  }

  const posts = []
  for (const file of files.filter((f) => f.endsWith('.md')).sort()) {
    const raw = await fs.readFile(path.join(dir, file), 'utf8')
    const { data, body } = parseFrontmatter(raw)
    const named = FILENAME.exec(file)

    const date = data.date || named?.[1]
    const slug = data.slug || named?.[2] || file.replace(/\.md$/, '')
    if (!date) {
      console.warn(`  ! skipping ${file}: no date in frontmatter or filename`)
      continue
    }
    if (data.draft) {
      console.log(`  · skipping draft: ${file}`)
      continue
    }

    const headings = []
    const { html, sidenotes } = renderMarkdown(body, { headings })

    posts.push({
      file,
      slug,
      date,
      title: data.title || slug,
      dek: data.dek || '',
      tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
      href: `/${slug}/`,
      html,
      headings,
      sidenoteCount: sidenotes.length,
      minutes: readingTime(body),
      excerpt: firstSentences(body),
    })
  }

  // Newest first, then numbered oldest-first so entry numbers are stable as
  // the archive grows.
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const total = posts.length
  posts.forEach((p, i) => { p.number = total - i })
  return posts
}

function firstSentences(body, max = 240) {
  const text = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/^\[\^[^\]]+\]:.*$/gm, '')
    .replace(/^#{1,6}\s.*$/gm, '')
    .replace(/\[\^[^\]]+\]/g, '')
    .replace(/[*_`>]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return `${text.slice(0, text.lastIndexOf(' ', max))}…`
}

export function groupByTag(posts) {
  const tags = new Map()
  for (const post of posts) {
    for (const tag of post.tags) {
      if (!tags.has(tag)) tags.set(tag, [])
      tags.get(tag).push(post)
    }
  }
  return new Map([...tags.entries()].sort((a, b) => b[1].length - a[1].length))
}

export function tagSlug(tag) {
  return tag.toLowerCase().replace(/[^\w]+/g, '-')
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

export function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${String(y).slice(2)}`
}
