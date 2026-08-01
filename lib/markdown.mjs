// Markdown -> HTML, with the three things a technical blog actually needs:
// build-time syntax highlighting, server-rendered LaTeX, and margin sidenotes.

import { readFileSync } from 'node:fs'
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
// YouTube
//
// A paragraph containing nothing but a YouTube link becomes a click-to-load
// embed: the thumbnail is a button, and the iframe is only created once someone
// presses play. Nothing from youtube.com is requested before that.
// ---------------------------------------------------------------------------

const YOUTUBE = /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,})|youtu\.be\/([\w-]{6,}))/

export function youtube(href = '') {
  const match = YOUTUBE.exec(href)
  if (!match) return null

  // ?t=490s, ?t=8m10s and ?start=490 all mean the same thing.
  const clock = /[?&](?:t|start)=(?:(\d+)h)?(?:(\d+)m)?(\d+)s?(?:&|$)/.exec(href)
  const start = clock
    ? Number(clock[1] || 0) * 3600 + Number(clock[2] || 0) * 60 + Number(clock[3])
    : 0

  return { id: match[1] || match[2], start, href }
}

function videoFigure({ id, start, href }, caption) {
  const plain = caption.replace(/<[^>]*>/g, '').trim()
  const label = plain ? `Play video: ${plain}` : 'Play video'
  const thumb = (name) => `https://i.ytimg.com/vi/${id}/${name}.jpg`
  // The thumbnail is progressive enhancement: fall back to the lower-res one,
  // then drop the <img> entirely so the styled placeholder shows through. A
  // blocked third-party image must not leave a broken-looking hole.
  const onError =
    `this.onerror=function(){this.remove()};this.src='${thumb('hqdefault')}'`
  return `<figure class="video">
  <button class="video-embed" type="button" data-yt="${id}" data-start="${start}"
          aria-label="${escapeHtml(label)}">
    <img src="${thumb('maxresdefault')}" alt="" width="1280" height="720" loading="lazy"
         onerror="${onError}">
    <span class="video-play" aria-hidden="true"></span>
    <span class="video-label" aria-hidden="true">${plain || 'Play video'}</span>
  </button>
  <figcaption>${caption ? `${caption} ` : ''}<a class="video-link" href="${href}"
    target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></figcaption>
</figure>
`
}

// ---------------------------------------------------------------------------
// Spotify + local video
//
// Same click-to-load contract as YouTube: a styled facade until you press play.
// ---------------------------------------------------------------------------

const SPOTIFY = /^https?:\/\/open\.spotify\.com\/(episode|show|track|album|playlist)\/([A-Za-z0-9]+)/

export function spotify(href = '') {
  const match = SPOTIFY.exec(href)
  return match ? { kind: match[1], id: match[2], href } : null
}

function audioFigure({ kind, id, href }, caption) {
  const plain = caption.replace(/<[^>]*>/g, '').trim()
  return `<figure class="audio">
  <button class="audio-embed" type="button" data-spotify="${kind}/${id}"
          aria-label="${escapeHtml(`Play: ${plain || 'Spotify episode'}`)}">
    <span class="audio-play" aria-hidden="true"></span>
    <span class="audio-label">${plain || 'Listen'}</span>
  </button>
  <figcaption><a class="video-link" href="${href}"
    target="_blank" rel="noopener noreferrer">Open in Spotify ↗</a></figcaption>
</figure>
`
}

/**
 * A self-hosted mp4. Its poster is the same path with a .jpg extension.
 *
 * Deliberately not `muted`: some of these have a soundtrack that is the entire
 * point, and nothing autoplays here, so there is no policy reason to mute.
 */
function localVideoFigure(href, caption) {
  return `<figure class="video">
  <video class="video-file" src="${href}" poster="${href.replace(/\.mp4$/, '.jpg')}"
         controls preload="none" playsinline width="1280" height="720"></video>
  ${caption ? `<figcaption>${caption}</figcaption>` : ''}
</figure>
`
}

// ---------------------------------------------------------------------------
// Diagrams
//
// `@diagram(name) Caption` inlines static/diagrams/<name>.svg so the drawing
// can use the page's own colour variables and follow the theme.
// ---------------------------------------------------------------------------

const diagramDir = new URL('../static/diagrams/', import.meta.url)

function diagramExtension() {
  return {
    name: 'diagram',
    level: 'block',
    start(src) { return src.indexOf('@diagram(') },
    tokenizer(src) {
      const m = /^@diagram\(([\w-]+)\)[ \t]*(.*)(?:\n|$)/.exec(src)
      if (m) return { type: 'diagram', raw: m[0], name: m[1], caption: m[2] }
    },
    renderer(token) {
      let svg
      try {
        svg = readFileSync(new URL(`${token.name}.svg`, diagramDir), 'utf8')
      } catch {
        console.warn(`  ! missing diagram: static/diagrams/${token.name}.svg`)
        return ''
      }
      return `<figure class="diagram">${svg.replace(/<\?xml[^>]*\?>/, '')}` +
        (token.caption ? `<figcaption>${token.caption}</figcaption>` : '') +
        `</figure>\n`
    },
  }
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
      diagramExtension(),
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
      // A lone image or YouTube link in a paragraph becomes a figure.
      paragraph({ tokens }) {
        if (tokens.length === 1 && tokens[0].type === 'link') {
          const { href } = tokens[0]
          const bare = tokens[0].text.replace(/^https?:\/\//, '') ===
                       href.replace(/^https?:\/\//, '')
          const caption = bare ? '' : this.parser.parseInline(tokens[0].tokens)

          const video = youtube(href)
          if (video) return videoFigure(video, caption)

          const episode = spotify(href)
          if (episode) return audioFigure(episode, caption)

          if (/\.mp4$/.test(href)) return localVideoFigure(href, caption)
        }
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
