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
<meta property="og:image" content="${abs('/portrait.png')}">
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

function header(kind) {
  const links = (runtime.nav || site.nav || [])
    .map((n) => `<a href="${n.href.startsWith('http') ? n.href : u(n.href)}">${n.label}</a>`)
    .join('')
  return `<header class="masthead ${kind === 'home' ? 'masthead-home' : ''}">
  <a class="wordmark" href="${u('/')}">
    ${POWER_GLYPH}
    <span class="wordmark-text">${site.title}</span>
  </a>
  <nav class="nav">${links}</nav>
  ${tononSwitch()}
</header>`
}

/**
 * The Tonon / Tonoff switch. Tonon = lights on = light mode. It is a real
 * rocker: the knob position is driven by the effective theme, so it also
 * reflects the system preference before anyone has clicked anything.
 */
function tononSwitch() {
  return `<button class="tonon" type="button"
    title="Tonon = lights on. Tonoff = lights off."
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
      <p class="footer-name">${site.title}</p>
      <p class="footer-meta">Written by ${escapeHtml(site.author.name)}. Set in Alegreya,
      built by a few hundred lines of Node, deployed by pushing to <code>main</code>.</p>
    </div>
    <ul class="footer-links">
      <li><a href="${u('/feed.xml')}">RSS</a></li>
      <li><a href="https://github.com/${site.author.github}">GitHub</a></li>
      <li><a href="mailto:${site.author.email}">Email</a></li>
      <li><a href="${u('/archive/')}">Archive</a></li>
    </ul>
  </div>
  <p class="colophon">© ${site.launchYear}–present · No trackers, no cookies, no
  newsletter. Just a man, a dog, and too many shell scripts.</p>
</footer>`
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export function homePage(posts, sections) {
  const body = `
${hero(posts)}
${posts.length
    ? sections.map(sectionBlock).join('\n')
    : `<section class="empty">
  <p class="section-label"><span>Entries</span></p>
  <article class="empty-card">
    <h2 class="empty-title">Nothing published yet.</h2>
    <p class="empty-body">The lights are on but nobody's home. Categories are
    sketched out; the writing is the part that takes longer than the build.</p>
    <p class="empty-more"><a class="readmore" href="${u('/about/')}">How this site works<span aria-hidden="true">→</span></a></p>
  </article>
</section>`}
`
  return layout({ body, kind: 'home', bodyClass: 'page-home', canonical: abs('/') })
}

function hero(posts) {
  const count = posts.length
  const stat = count
    ? `${count} ${count === 1 ? 'entry' : 'entries'} · no roadmap`
    : 'no entries yet · no roadmap'

  return `<section class="hero">
  <div class="hero-text">
    <p class="eyebrow">Personal blog · ${stat}</p>
    <h1 class="hero-title">Tonon<br>Journey<span class="hero-period">.</span></h1>
    <p class="hero-tagline">${site.tagline}</p>
    <p class="hero-body">
      I build tools for coding agents and then write down what happened.
      Sometimes that is a skill which saves an hour a day. Sometimes it is an
      evening spent teaching a computer to click a button on a desktop
      <em>nobody can see</em>. Both get written up here.
    </p>
    <p class="hero-byline"><strong>${escapeHtml(site.author.name)}</strong> — ${escapeHtml(site.author.bio)}</p>
  </div>
  <figure class="portrait">
    <div class="portrait-plate">
      <img src="${u('/portrait.png')}" width="460" height="460"
           alt="Lucas Tonon holding a small brown dog, both looking at the camera">
    </div>
    <figcaption><b>Lucas Tonon</b><span>the dog handles code review</span></figcaption>
  </figure>
</section>`
}

function sectionBlock(section) {
  const [latest, ...rest] = section.posts
  return `<section class="featured" id="${section.slug}">
  <p class="section-label"><span>${escapeHtml(section.title)}</span></p>
  ${section.blurb ? `<p class="section-blurb">${escapeHtml(section.blurb)}</p>` : ''}
  <article class="feature-card">
    <p class="feature-meta">
      <span class="num">${String(latest.number).padStart(2, '0')}</span>
      <span class="dot">·</span>
      <time datetime="${latest.date}">${formatDate(latest.date)}</time>
      <span class="dot">·</span>
      <span>${latest.minutes} min</span>
    </p>
    <h2 class="feature-title"><a href="${u(latest.href)}">${escapeHtml(latest.title)}</a></h2>
    <p class="feature-dek">${latest.dek || latest.excerpt}</p>
    <p class="feature-more"><a class="readmore" href="${u(latest.href)}">Read it<span aria-hidden="true">→</span></a></p>
  </article>
  ${rest.length ? `<ol class="entries">
${rest.map((post, i) => entryRow(post, i + 1)).join('\n')}
  </ol>` : ''}
  <p class="archive-more"><a class="readmore" href="${u(`/${section.slug}/`)}">All ${section.title.toLowerCase()}<span aria-hidden="true">→</span></a></p>
</section>`
}

function entryRow(post, i) {
  return `    <li class="entry" style="--i:${i}">
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

export function postPage(post, { prev, next, section }) {
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
      ${section ? `<a href="${u(`/${section.slug}/`)}">${escapeHtml(section.title)}</a> ·` : ''}
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

export function listPage({ title, label, intro, posts, canonical }) {
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
</div>
<div class="archive">
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
  will not bring it back, though you are welcome to try.</p>
  <p><a class="readmore" href="${u('/')}">Back to the journey<span aria-hidden="true">→</span></a></p>
</section>
`
  return layout({ title: 'Not found', body, bodyClass: 'page-404' })
}
