# Ablations

A hand-rolled static blog. Markdown in, letterpress HTML out — no framework, no
client-side rendering, no build step beyond `node build.mjs`.

**Live:** https://lucastononro.github.io/ablations/

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321/ablations/ — rebuilds on save
npm run build    # writes dist/
```

## Writing a post

Drop a file in `posts/` named `YYYY-MM-DD-some-slug.md`. The date and slug come
from the filename; frontmatter can override either.

```markdown
---
title: What a loss spike actually tells you
dek: One-sentence standfirst, shown on the index and in the RSS feed.
date: 2026-07-24
tags: [optimization, training-dynamics]
draft: false
---

Body starts here. The first paragraph's first line is set in small caps.
```

Set `draft: true` to keep a post out of the build.

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
site.config.mjs         title, author, base path, nav — the only place these live
build.mjs               the whole build: posts + pages -> dist/
serve.mjs               dev server, rebuilds on change
lib/markdown.mjs        marked + KaTeX + Shiki + sidenotes
lib/content.mjs         frontmatter, slugs, dates, tags, reading time
lib/templates.mjs       every page shape
lib/feed.mjs            RSS, sitemap, robots.txt
posts/                  YYYY-MM-DD-slug.md
pages/                  standalone pages (about.md -> /about/)
static/                 copied verbatim: styles.css, theme.js, favicon.svg
```

Generated for you on every build: the index, one page per post, `/archive/`,
`/tags/` plus a page per tag, `404.html`, `feed.xml`, `sitemap.xml`,
`robots.txt`, and `.nojekyll`.

## Deploying

`.github/workflows/pages.yml` builds on every push to `main` and publishes
`dist/` to GitHub Pages. Nothing to configure beyond setting **Settings → Pages
→ Source** to **GitHub Actions** once.

### Moving to a custom domain or user site

Set `base: ''` in `site.config.mjs` and update `origin`. Every internal link,
the feed, the sitemap, and the dev server follow from those two fields — there
are no other hardcoded paths.

## Design notes

Warm paper and ink with a single vermilion accent, in light and dark. Instrument
Serif for display, Newsreader for text, IBM Plex Mono for labels. Client-side
JavaScript totals about thirty lines: a theme toggle and a keyboard handler for
the margin notes. Everything else — the reading-progress bar, the margin-note
layout, the staggered page load, the theme switch — is CSS.

The three posts included are starter content. Delete them.
