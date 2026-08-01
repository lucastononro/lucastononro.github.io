// Markdown -> HTML, with the three things a technical blog actually needs:
// build-time syntax highlighting, server-rendered LaTeX, and margin sidenotes.

import { Marked } from 'marked'
import katex from 'katex'
import { createHighlighter } from 'shiki'
import { site, u } from '../site.config.mjs'

const LANGS = [
  'python', 'javascript', 'typescript', 'jsx', 'tsx', 'bash', 'shell',
  'json', 'yaml', 'toml', 'diff', 'rust', 'go', 'c', 'cpp', 'sql',
  'html', 'css', 'markdown', 'text',
]

const THEMES = { light: 'vitesse-light', dark: 'vitesse-dark' }

let highlighter

export async function initHighlighter() {
  highlighter = await createHighlighter({
    themes: Object.values(THEMES),
    langs: LANGS,
  })
  return highlighter
}

function highlight(code, lang) {
  const loaded = highlighter.getLoadedLanguages()
  const alias = { sh: 'bash', zsh: 'bash', js: 'javascript', ts: 'typescript', py: 'python' }
  const resolved = alias[lang] || lang
  return highlighter.codeToHtml(code, {
    lang: loaded.includes(resolved) ? resolved : 'text',
    themes: THEMES,
    // Emit both themes as CSS variables so the theme toggle is instant and
    // needs no re-highlighting on the client.
    defaultColor: false,
    colorReplacements: {},
  })
}

function tex(src, displayMode) {
  try {
    return katex.renderToString(src.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
      output: 'html',
      trust: false,
    })
  } catch (err) {
    console.warn(`  ! katex: ${err.message}`)
    return `<code class="tex-error">${escapeHtml(src)}</code>`
  }
}

export function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

// ---------------------------------------------------------------------------
// Sidenotes
//
// `[^note]` in the prose becomes a superscript marker followed immediately by
// an <aside>. On wide screens CSS floats that aside into the right margin; on
// narrow screens it becomes an indented block. No JS either way.
// ---------------------------------------------------------------------------

const SIDENOTE_DEF = /^\[\^([^\]\s]+)\]:[ \t]*((?:.*)(?:\n(?![ \t]*\n|\[\^).*)*)/gm

function extractSidenotes(markdown) {
  const notes = new Map()
  const body = markdown.replace(SIDENOTE_DEF, (_, id, text) => {
    notes.set(id, text.trim().replace(/\n[ \t]*/g, ' '))
    return ''
  })
  return { body, notes }
}

// ---------------------------------------------------------------------------

export function renderMarkdown(markdown, { headings } = {}) {
  const { body, notes } = extractSidenotes(markdown)
  const order = []
  const collected = []

  const marked = new Marked({ gfm: true, breaks: false })

  marked.use({
    extensions: [
      {
        name: 'mathBlock',
        level: 'block',
        start(src) { return src.indexOf('$$') },
        tokenizer(src) {
          const m = /^\$\$([\s\S]+?)\$\$(?:\n+|$)/.exec(src)
          if (m) return { type: 'mathBlock', raw: m[0], text: m[1] }
        },
        renderer(t) { return `<div class="math-block">${tex(t.text, true)}</div>\n` },
      },
      {
        name: 'mathInline',
        level: 'inline',
        start(src) { return src.indexOf('$') },
        tokenizer(src) {
          const m = /^\$(?!\s)((?:\\.|[^$\\])+?)(?<![\s\\])\$(?!\d)/.exec(src)
          if (m) return { type: 'mathInline', raw: m[0], text: m[1] }
        },
        renderer(t) { return tex(t.text, false) },
      },
      {
        name: 'sidenote',
        level: 'inline',
        start(src) { return src.indexOf('[^') },
        tokenizer(src) {
          const m = /^\[\^([^\]\s]+)\]/.exec(src)
          if (m) return { type: 'sidenote', raw: m[0], id: m[1] }
        },
        renderer(t) {
          if (!notes.has(t.id)) return ''
          if (!order.includes(t.id)) order.push(t.id)
          const n = order.indexOf(t.id) + 1
          const inner = marked.parseInline(notes.get(t.id))
          collected.push({ n, html: inner })
          // Deliberately a <span>, not an <aside>: the HTML parser closes an
          // open <p> when it meets a block-level element, which would split
          // the paragraph in two and drop the rest of it out of the measure.
          return (
            `<label class="sn-ref" for="sn-${t.id}" tabindex="0">${n}</label>` +
            `<input type="checkbox" id="sn-${t.id}" class="sn-toggle" aria-hidden="true">` +
            `<span class="sidenote" role="note"><span class="sn-num">${n}</span>${inner}</span>`
          )
        },
      },
    ],
    renderer: {
      code({ text, lang }) {
        return highlight(text, (lang || '').trim().split(/\s+/)[0])
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens)
        const id = slugify(inner)
        if (headings && depth <= 3) headings.push({ id, depth, text: inner })
        return (
          `<h${depth} id="${id}"><a class="anchor" href="#${id}" ` +
          `aria-label="Permalink">§</a>${inner}</h${depth}>\n`
        )
      },
      // A lone image in a paragraph is a figure. The alt text is the caption.
      paragraph({ tokens }) {
        const inner = this.parser.parseInline(tokens)
        const only = tokens.length === 1 && tokens[0].type === 'image'
        if (only) {
          const { text, href } = tokens[0]
          return (
            `<figure><img src="${href}" alt="${escapeHtml(text)}" loading="lazy">` +
            (text ? `<figcaption>${text}</figcaption>` : '') +
            `</figure>\n`
          )
        }
        return `<p>${inner}</p>\n`
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens)
        const external = /^https?:\/\//.test(href)
        // Author links as `/feed.xml`; the base path gets applied here so a
        // change to site.base does not require touching any markdown.
        const resolved = href.startsWith('/') && !href.startsWith(`${site.base}/`)
          ? u(href)
          : href
        const attrs = [
          `href="${resolved}"`,
          title ? `title="${escapeHtml(title)}"` : '',
          external ? 'target="_blank" rel="noopener noreferrer"' : '',
          external ? 'class="external"' : '',
        ].filter(Boolean).join(' ')
        return `<a ${attrs}>${inner}</a>`
      },
      table({ header, rows }) {
        const th = header.map((c) => `<th align="${c.align || 'left'}">${this.parser.parseInline(c.tokens)}</th>`).join('')
        const tr = rows
          .map((row) => `<tr>${row.map((c) => `<td align="${c.align || 'left'}">${this.parser.parseInline(c.tokens)}</td>`).join('')}</tr>`)
          .join('\n')
        return `<div class="table-scroll"><table><thead><tr>${th}</tr></thead><tbody>\n${tr}\n</tbody></table></div>\n`
      },
    },
  })

  const html = marked.parse(body.trim())
  return { html, sidenotes: collected }
}

/** Rough reading time. 220 wpm, math and code discounted to a flat cost. */
export function readingTime(markdown) {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' [code] ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' [math] ')
    .trim()
    .split(/\s+/).length
  return Math.max(1, Math.round(words / 220))
}
