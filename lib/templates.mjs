import { site, u, abs } from '../site.config.mjs'
import { escapeHtml } from './markdown.mjs'
import { formatDate, shortDate, tagSlug } from './content.mjs'

const FONTS =
  'https://fonts.googleapis.com/css2' +
  '?family=Instrument+Serif:ital@0;1' +
  '&family=Newsreader:ital,opsz,wght@0,6..72,200..700;1,6..72,200..600' +
  '&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400' +
  '&display=swap'

const KATEX_CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css'

// Set the theme before first paint so a dark-mode reader never sees a white
// flash. Kept inline and tiny on purpose.
const THEME_BOOT = `(()=>{try{const t=localStorage.getItem("theme");
if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}})()`

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
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#f7f3ec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#100f0d" media="(prefers-color-scheme: dark)">
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

function header(kind) {
  const links = site.nav
    .map((n) => `<a href="${n.href.startsWith('http') ? n.href : u(n.href)}">${n.label}</a>`)
    .join('')
  return `<header class="masthead ${kind === 'home' ? 'masthead-home' : ''}">
  <a class="wordmark" href="${u('/')}">
    <span class="wordmark-mark" aria-hidden="true">∇</span>
    <span class="wordmark-text">${site.title}</span>
  </a>
  <nav class="nav">${links}</nav>
  <button class="theme-toggle" type="button" aria-label="Switch colour theme" title="Switch colour theme">
    <span class="theme-toggle-dot" aria-hidden="true"></span>
  </button>
</header>`
}

function footer() {
  const year = site.launchYear || 2026
  return `<footer class="footer">
  <div class="footer-rule" aria-hidden="true"></div>
  <div class="footer-grid">
    <div>
      <p class="footer-name">${site.title}</p>
      <p class="footer-meta">Written by ${escapeHtml(site.author.name)}. Set in Instrument&nbsp;Serif, Newsreader &amp; IBM&nbsp;Plex&nbsp;Mono.</p>
    </div>
    <ul class="footer-links">
      <li><a href="${u('/feed.xml')}">RSS</a></li>
      <li><a href="https://github.com/${site.author.github}">GitHub</a></li>
      <li><a href="mailto:${site.author.email}">Email</a></li>
      <li><a href="${u('/archive/')}">Archive</a></li>
    </ul>
  </div>
  <p class="colophon">© ${year}–present · No trackers, no cookies, no newsletter popup.</p>
</footer>`
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------

export function homePage(posts, tags) {
  const [latest, ...rest] = posts

  const entries = rest
    .map((post, i) => entryRow(post, i + 1))
    .join('\n')

  const tagList = [...tags.entries()]
    .slice(0, 8)
    .map(([tag, list]) =>
      `<a class="tag" href="${u(`/tags/${tagSlug(tag)}/`)}">${escapeHtml(tag)}<span>${list.length}</span></a>`)
    .join('')

  const body = `
<section class="hero">
  <div class="hero-text">
    <p class="eyebrow">Working notebook &nbsp;/&nbsp; ${posts.length} ${posts.length === 1 ? 'entry' : 'entries'} &nbsp;/&nbsp; updated ${shortDate(posts[0].date)}</p>
    <h1 class="hero-title">Ablations<span class="hero-period">.</span></h1>
    <p class="hero-tagline">${site.tagline}</p>
    <p class="hero-body">
      Remove a component, hold everything else fixed, measure what breaks. It is
      the only honest way to learn what a system is doing — and it is roughly
      how I think about writing things down. These are notes on
      <em>language models</em>, training dynamics, and the measurement problems
      that come with both.
    </p>
    <div class="hero-tags">${tagList}</div>
  </div>
  ${lossCurve()}
</section>

<section class="featured">
  <p class="section-label"><span>Latest</span></p>
  <article class="feature-card">
    <p class="feature-meta">
      <span class="num">№&nbsp;${String(latest.number).padStart(3, '0')}</span>
      <span class="dot">·</span>
      <time datetime="${latest.date}">${formatDate(latest.date)}</time>
      <span class="dot">·</span>
      <span>${latest.minutes} min</span>
    </p>
    <h2 class="feature-title"><a href="${u(latest.href)}">${escapeHtml(latest.title)}</a></h2>
    <p class="feature-dek">${latest.dek || latest.excerpt}</p>
    <p class="feature-more"><a class="readmore" href="${u(latest.href)}">Read the entry<span aria-hidden="true">→</span></a></p>
  </article>
</section>

${rest.length ? `<section class="archive-list">
  <p class="section-label"><span>Earlier</span></p>
  <ol class="entries">
${entries}
  </ol>
  <p class="archive-more"><a class="readmore" href="${u('/archive/')}">Full archive<span aria-hidden="true">→</span></a></p>
</section>` : ''}
`
  return layout({
    body,
    kind: 'home',
    bodyClass: 'page-home',
    canonical: abs('/'),
  })
}

function entryRow(post, i) {
  return `    <li class="entry" style="--i:${i}">
      <a class="entry-link" href="${u(post.href)}">
        <span class="entry-num">${String(post.number).padStart(3, '0')}</span>
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

/**
 * A decorative training curve. Two runs, one ablated. Drawn once at build time
 * and animated in with stroke-dashoffset — no chart library, no client JS.
 */
function lossCurve() {
  const w = 420, h = 300
  const curve = (a, b, noise) => {
    const pts = []
    for (let i = 0; i <= 60; i++) {
      const t = i / 60
      const y = a * Math.exp(-3.1 * t) + b + noise * Math.sin(i * 1.7) * (1 - t) * 0.6
      pts.push([28 + t * (w - 44), h - 34 - (y / 3.2) * (h - 70)])
    }
    return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  }
  const grid = Array.from({ length: 5 }, (_, i) => {
    const y = 26 + i * ((h - 60) / 4)
    return `<line x1="28" y1="${y.toFixed(1)}" x2="${w - 16}" y2="${y.toFixed(1)}"/>`
  }).join('')

  return `<figure class="curve" aria-hidden="true">
  <svg viewBox="0 0 ${w} ${h}" role="presentation">
    <g class="curve-grid">${grid}</g>
    <line class="curve-axis" x1="28" y1="26" x2="28" y2="${h - 34}"/>
    <line class="curve-axis" x1="28" y1="${h - 34}" x2="${w - 16}" y2="${h - 34}"/>
    <path class="curve-line curve-baseline" d="${curve(2.6, 0.42, 0.07)}"/>
    <path class="curve-line curve-ablated" d="${curve(2.5, 1.15, 0.1)}"/>
  </svg>
  <figcaption>
    <span><i class="key key-base"></i>full model</span>
    <span><i class="key key-abl"></i>component removed</span>
  </figcaption>
</figure>`
}

// ---------------------------------------------------------------------------
// Post
// ---------------------------------------------------------------------------

export function postPage(post, { prev, next }) {
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
    <p class="post-kicker">№&nbsp;${String(post.number).padStart(3, '0')}</p>
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
      <summary>Cite this entry</summary>
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
// Archive, tags, plain pages, 404
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
${groups}
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
  <p class="eyebrow">404 &nbsp;/&nbsp; ablated</p>
  <h1 class="hero-title">Nothing<br><em>here</em>.</h1>
  <p class="hero-body">This component was removed and, as it turns out, the page
  still loads. Call it a successful ablation.</p>
  <p><a class="readmore" href="${u('/')}">Back to the index<span aria-hidden="true">→</span></a></p>
</section>
`
  return layout({ title: 'Not found', body, bodyClass: 'page-404' })
}
