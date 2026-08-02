import { site, u, abs } from '../site.config.mjs'
import { escapeHtml } from './markdown.mjs'
import { formatDate, shortDate, tagSlug } from './content.mjs'

const FONTS =
  'https://fonts.googleapis.com/css2' +
  '?family=Alegreya:ital,wght@0,400..800;1,400..700' +
  '&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400' +
  '&family=IBM+Plex+Mono:wght@400;500' +
  '&display=swap'

const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'

// Set the theme before first paint so a dark-mode reader never sees a white
// flash. Kept inline and tiny on purpose.
const THEME_BOOT = `(()=>{try{const t=localStorage.getItem("theme");
if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`

/** build.mjs fills this in once it knows which sections actually have posts. */
export const runtime = { nav: null }

export function layout({ title, description, body, canonical, kind = 'page', bodyClass = '' }) {
  const pageTitle = title ? `${title} · ${site.title}` : `${site.title} — ${site.tagline}`
  return `<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(description || site.description)}">
<meta name="author" content="${escapeHtml(site.author.name)}">
<link rel="canonical" href="${canonical || abs('/')}">
<meta property="og:type" content="${kind === 'post' ? 'article' : 'website'}">
<meta property="og:site_name" content="${escapeHtml(site.title)}">
<meta property="og:title" content="${escapeHtml(title || site.title)}">
<meta property="og:description" content="${escapeHtml(description || site.description)}">
<meta property="og:url" content="${canonical || abs('/')}">
<meta property="og:image" content="${abs('/portrait.jpg')}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#f7f2e8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14120e" media="(prefers-color-scheme: dark)">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.title)}" href="${u('/feed.xml')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${KATEX_CSS}">
<link rel="stylesheet" href="${u('/styles.css')}">
<link rel="icon" href="${u('/favicon.svg')}" type="image/svg+xml">
<script>${THEME_BOOT}</script>
</head>
<body class="${bodyClass}">
<div class="grain" aria-hidden="true"></div>
<a class="skip" href="#main">Skip to content</a>
${header(kind)}
<main id="main">
${body}
</main>
${footer()}
<script src="${u('/theme.js')}" defer></script>
</body>
</html>
`
}

const POWER_GLYPH = `<svg class="wordmark-mark" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 2.6v6" />
    <path d="M15.2 5.1a7 7 0 1 1-10.4 0" />
  </svg>`

/**
 * "Tonon" with the lights on, "Tonoff" with them off. Both halves are in the
 * markup; CSS shows one. The switch changes the name of the site, which is the
 * entire reason the switch is called what it is called.
 */
function tononWord() {
  return 'Ton<span class="wm-on">on</span><span class="wm-off">off</span>'
}

// Brand marks, inlined so they inherit currentColor and follow the theme.
const GITHUB_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`
const LINKEDIN_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>`
const X_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>`

function socialIcons() {
  return `<div class="nav-icons">
    <a href="https://github.com/${site.author.github}" aria-label="GitHub" title="GitHub"
       target="_blank" rel="noopener noreferrer">${GITHUB_ICON}</a>
    <a href="https://www.linkedin.com/in/${site.author.linkedin}" aria-label="LinkedIn" title="LinkedIn"
       target="_blank" rel="noopener noreferrer">${LINKEDIN_ICON}</a>
    <a href="https://x.com/${site.author.x}" aria-label="X" title="X"
       target="_blank" rel="noopener noreferrer">${X_ICON}</a>
  </div>`
}

function header(kind) {
  const links = (runtime.nav || [])
    .map((n) => `<a href="${n.href.startsWith('http') ? n.href : u(n.href)}">${n.label}</a>`)
    .join('')
  return `<header class="masthead ${kind === 'home' ? 'masthead-home' : ''}">
  <a class="wordmark" href="${u('/')}">
    ${POWER_GLYPH}
    <span class="wordmark-text">${tononWord()} Journey</span>
  </a>
  <nav class="nav">${links}</nav>
  ${socialIcons()}
  ${tononSwitch()}
</header>`
}

/**
 * The Tonon / Tonoff switch. Tonon = lights on = light mode. It is a real
 * rocker: the knob position is driven by the effective theme, so it also
 * reflects the system preference before anyone has clicked anything.
 */
function tononSwitch(extra = '') {
  return `<button class="tonon ${extra}" type="button"
    title="Tonon = lights on. Tonoff = lights off. Naming it took longer than building it."
    aria-label="Switch between light and dark">
    <span class="tonon-track" aria-hidden="true">
      <span class="tonon-word tonon-word-on">Tonon</span>
      <span class="tonon-word tonon-word-off">Tonoff</span>
      <span class="tonon-knob"></span>
    </span>
  </button>`
}

function footer() {
  return `<footer class="footer">
  <div class="footer-rule" aria-hidden="true"></div>
  <div class="footer-grid">
    <div>
      <p class="footer-name">${tononWord()} Journey</p>
      <p class="footer-meta">Set in Alegreya. Built by a few hundred lines of Node,
      deployed by pushing to <code>main</code> and hoping.</p>
    </div>
    <ul class="footer-links">
      <li><a href="${u('/feed/')}">Feed</a></li>
      <li><a href="${u('/feed.xml')}">RSS</a></li>
      <li><a href="https://github.com/${site.author.github}">GitHub</a></li>
      <li><a href="https://www.linkedin.com/in/${site.author.linkedin}">LinkedIn</a></li>
      <li><a href="https://x.com/${site.author.x}">X</a></li>
      <li><a href="mailto:${site.author.email}">Email</a></li>
    </ul>
  </div>
  <p class="colophon">© ${site.launchYear}–present · No trackers, no cookies, no
  newsletter, no cookie banner about the cookies there aren't. Just a man, a dog,
  and too many shell scripts.</p>
</footer>`
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export function homePage(posts, filters) {
  const body = `
${hero(posts)}
${posts.length
    ? `<section class="featured" id="feed">
  <p class="section-label"><span>The feed</span></p>
  ${filterBar(filters, posts.length)}
  <div data-filterable>
    <ol class="entries entries-lead">
${posts.map((post, i) => entryRow(post, i)).join('\n')}
    </ol>
  </div>
</section>`
    : `<section class="empty">
  <p class="section-label"><span>The feed</span></p>
  <article class="empty-card">
    <h2 class="empty-title">Nothing published yet.</h2>
    <p class="empty-body">Lights on, nobody home.</p>
  </article>
</section>`}
`
  return layout({ body, kind: 'home', bodyClass: 'page-home', canonical: abs('/') })
}

/**
 * Filter chips are real links to category pages, so the thing works with
 * JavaScript switched off; theme.js upgrades them to filter in place.
 */
function filterBar(filters, total) {
  const chipHtml = filters
    .map(({ slug, count }) => `<a class="filter-chip${count ? '' : ' filter-chip-empty'}" data-tag="${escapeHtml(slug)}"
      href="${u(`/tags/${tagSlug(slug)}/`)}">${escapeHtml(slug)}<span>${count}</span></a>`)
    .join('')

  return `<div class="filters" role="group" aria-label="Filter the feed">
    <a class="filter-chip" data-tag="" href="${u('/feed/')}" aria-current="true">everything<span>${total}</span></a>
    ${chipHtml}
    <span class="filter-count" data-filter-count aria-live="polite"></span>
  </div>`
}

function hero(posts) {
  const count = posts.length
  return `<section class="hero">
  <div class="hero-text">
    <p class="eyebrow">Personal blog · ${count} entries · no roadmap, no newsletter</p>
    <h1 class="hero-title">${tononWord()}<br>Journey<span class="hero-period">.</span></h1>
    <p class="hero-tagline">${site.tagline}</p>
    <p class="hero-body">
      I build tools for coding agents and write down how they work. Real
      repositories, real code, no throat-clearing.
    </p>
    <p class="hero-byline"><strong>${escapeHtml(site.author.name)}</strong> — ${escapeHtml(site.author.bio)}</p>
  </div>
  <figure class="portrait">
    <span class="portrait-frame">
      <img class="portrait-img portrait-on" src="${u('/portrait.jpg')}" width="920" height="920"
           alt="Lucas Tonon holding a small brown dog, both looking at the camera">
      <img class="portrait-img portrait-off" src="${u('/tonoff.jpg')}" width="920" height="920"
           alt="Lucas Tonon with his eyes closed, hugging the same dog">
    </span>
    <figcaption>
      <b>Lucas Tonon</b>
      <span class="cap-on">awake. code review handled by the dog</span>
      <span class="cap-off">off. the dog is also off</span>
    </figcaption>
    ${tononSwitch('tonon-hero')}
  </figure>
</section>`
}

function entryRow(post, i) {
  const tags = post.tags.map((t) => escapeHtml(t)).join(' ')
  return `    <li class="entry" style="--i:${i}" data-tags="${tags}">
      <a class="entry-link" href="${u(post.href)}">
        <span class="entry-num">${String(post.number).padStart(2, '0')}</span>
        <span class="entry-main">
          <span class="entry-head">
            <span class="entry-title">${escapeHtml(post.title)}</span>
            <span class="entry-leader" aria-hidden="true"></span>
            <time class="entry-date" datetime="${post.date}">${shortDate(post.date)}</time>
          </span>
          <span class="entry-dek">${post.dek || post.excerpt}</span>
        </span>
      </a>
    </li>`
}

// ---------------------------------------------------------------------------
// Post
// ---------------------------------------------------------------------------

export function postPage(post, { prev, next, kicker }) {
  const tags = post.tags
    .map((t) => `<a class="tag tag-sm" href="${u(`/tags/${tagSlug(t)}/`)}">${escapeHtml(t)}</a>`)
    .join('')

  const toc = post.headings.filter((h) => h.depth === 2)
  const tocHtml = toc.length >= 3
    ? `<nav class="toc" aria-label="Contents">
    <p class="toc-label">Contents</p>
    <ol>${toc.map((h) => `<li><a href="#${h.id}">${h.text}</a></li>`).join('')}</ol>
  </nav>`
    : ''

  const body = `
<article class="post">
  <div class="progress" aria-hidden="true"></div>
  <header class="post-head">
    <p class="post-kicker">
      ${kicker
    ? `<a href="${u(`/tags/${tagSlug(kicker)}/`)}">${escapeHtml(kicker)}</a> ·`
    : ''}
      ${String(post.number).padStart(2, '0')}
    </p>
    <h1 class="post-title">${escapeHtml(post.title)}</h1>
    ${post.dek ? `<p class="post-dek">${post.dek}</p>` : ''}
    <dl class="post-meta">
      <div><dt>Published</dt><dd><time datetime="${post.date}">${formatDate(post.date)}</time></dd></div>
      <div><dt>Reading</dt><dd>${post.minutes} min${post.sidenoteCount ? ` · ${post.sidenoteCount} note${post.sidenoteCount === 1 ? '' : 's'}` : ''}</dd></div>
      <div><dt>Filed under</dt><dd class="post-meta-tags">${tags || '—'}</dd></div>
    </dl>
  </header>
  ${tocHtml}
  <div class="post-body">
${post.html}
  </div>
  <footer class="post-foot">
    <details class="cite">
      <summary>Cite this</summary>
      <pre class="bibtex"><code>${escapeHtml(bibtex(post))}</code></pre>
    </details>
    <nav class="pager">
      ${next ? `<a class="pager-item pager-prev" href="${u(next.href)}">
        <span class="pager-label">← Previous</span>
        <span class="pager-title">${escapeHtml(next.title)}</span>
      </a>` : '<span class="pager-item pager-empty"></span>'}
      ${prev ? `<a class="pager-item pager-next" href="${u(prev.href)}">
        <span class="pager-label">Next →</span>
        <span class="pager-title">${escapeHtml(prev.title)}</span>
      </a>` : '<span class="pager-item pager-empty"></span>'}
    </nav>
  </footer>
</article>
`
  return layout({
    title: post.title,
    description: post.dek || post.excerpt,
    body,
    kind: 'post',
    bodyClass: 'page-post',
    canonical: abs(post.href),
  })
}

function bibtex(post) {
  const key = `${site.author.github}${post.date.slice(0, 4)}${post.slug.split('-')[0]}`
  return `@misc{${key},
  author = {${site.author.name}},
  title  = {${post.title}},
  year   = {${post.date.slice(0, 4)}},
  note   = {${site.title}},
  url    = {${abs(post.href)}}
}`
}

// ---------------------------------------------------------------------------
// Archive, sections, tags, plain pages, 404
// ---------------------------------------------------------------------------

export function listPage({ title, label, intro, posts, canonical, filters }) {
  const byYear = new Map()
  for (const post of posts) {
    const year = post.date.slice(0, 4)
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year).push(post)
  }

  const groups = [...byYear.entries()]
    .map(([year, list]) => `<section class="year">
    <h2 class="year-label">${year}</h2>
    <ol class="entries">
${list.map((p, i) => entryRow(p, i + 1)).join('\n')}
    </ol>
  </section>`)
    .join('\n')

  const body = `
<div class="page-head">
  <p class="section-label"><span>${label}</span></p>
  <h1 class="page-title">${escapeHtml(title)}</h1>
  ${intro ? `<p class="page-intro">${intro}</p>` : ''}
  ${filters ? filterBar(filters, posts.length) : ''}
</div>
<div class="archive"${filters ? ' data-filterable' : ''}>
${groups || `<p class="empty-body">Nothing here yet.</p>`}
</div>
`
  return layout({ title, description: intro, body, bodyClass: 'page-list', canonical })
}

export function prosePage({ title, label, html, canonical, description }) {
  const body = `
<article class="post post-prose">
  <header class="post-head">
    <p class="post-kicker">${label}</p>
    <h1 class="post-title">${escapeHtml(title)}</h1>
  </header>
  <div class="post-body">
${html}
  </div>
</article>
`
  return layout({ title, description, body, bodyClass: 'page-post', canonical })
}

export function notFoundPage() {
  const body = `
<section class="notfound">
  <p class="eyebrow">404 · Tonoff</p>
  <h1 class="hero-title">This page<br>is <em>off</em>.</h1>
  <p class="hero-body">Nothing at this address. Flicking the switch in the corner
  will not bring it back, but I admire the instinct.</p>
  <p><a class="readmore" href="${u('/')}">Back to the journey<span aria-hidden="true">→</span></a></p>
</section>
`
  return layout({ title: 'Not found', body, bodyClass: 'page-404' })
}
