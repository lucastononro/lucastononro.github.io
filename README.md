# Tonon Journey

My blog. A hand-rolled static site — markdown in, HTML out. No framework, no
client-side rendering, no build step beyond `node build.mjs`.

**Live:** https://lucastononro.github.io

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321 — rebuilds on save
npm run build    # writes dist/
```

## Writing a post

Drop a file in `posts/` named `YYYY-MM-DD-some-slug.md`. The date and slug come
from the filename; frontmatter can override either.

```markdown
---
title: "notify: teaching the agent to shout down the hallway"
dek: One-sentence standfirst, shown on the index and in the RSS feed.
date: 2026-05-27
section: skills
tags: [claude-code, mcp, skills]
draft: false
---

Body starts here. The first line of the first paragraph is set in small caps.
```

Set `draft: true` to keep a post out of the build.

### Categories

Sections live in `site.config.mjs`. A post joins one with `section: <slug>`;
anything without one falls into `defaultSection`. Each section with at least one
post gets a page at `/<slug>/`, a block on the home page, and a nav slot —
empty categories are never advertised. Adding one is a config entry plus a post.

### What the markdown supports

| You write | You get |
| --- | --- |
| ` ```python ` | Shiki highlighting, applied at build time, dual-themed |
| `$x^2$` / `$$…$$` | KaTeX, rendered at build time — no client-side math JS |
| `[^note]` + `[^note]: text` | A margin note, floated into the right gutter on wide screens and collapsible inline on narrow ones |
| `![caption](img.png)` alone in a paragraph | A `<figure>` with the alt text as its caption |
| `/feed.xml` | Root-relative links get the site's base path applied automatically |
| `## Heading` | An anchor link plus a margin section number |

Three or more `##` headings in a post generate a table of contents.

## Layout

```
site.config.mjs         title, author, base path, categories — the only place these live
build.mjs               the whole build: posts + pages -> dist/
serve.mjs               dev server, rebuilds on change
lib/markdown.mjs        marked + KaTeX + Shiki + sidenotes
lib/content.mjs         frontmatter, slugs, dates, tags, sections, reading time
lib/templates.mjs       every page shape
lib/feed.mjs            RSS, sitemap, robots.txt
posts/                  YYYY-MM-DD-slug.md
pages/                  standalone pages (about.md -> /about/)
static/                 copied verbatim: styles.css, theme.js, portrait.png, favicon.svg
```

Generated on every build: the home page, one page per post, one page per
category, `/archive/`, `/tags/` plus a page per tag, `404.html`, `feed.xml`,
`sitemap.xml`, `robots.txt`, and `.nojekyll`.

## Deploying

`.github/workflows/pages.yml` builds on every push to `main` and publishes
`dist/` to GitHub Pages. The only one-time setup is **Settings → Pages → Source
→ GitHub Actions**.

Moving to a custom domain: set `origin` (and `base`, if it lives under a path)
in `site.config.mjs`. Every internal link, the feed, and the sitemap follow from
those two fields — nothing else hardcodes a URL.

## Design notes

Warm paper and ink with a single terracotta accent, in light and dark. Set in
Alegreya and Alegreya Sans — a humanist superfamily built for long-form reading
— with IBM Plex Mono for code.

The light/dark control is the **Tonon/Tonoff** switch: Tonon means the lights
are on. It reflects the OS preference until you flick it, then remembers.

Client-side JavaScript totals about forty lines: that switch and a keyboard
handler for the margin notes. The reading-progress bar, the margin-note layout,
the staggered page load and the theme itself are all CSS.
