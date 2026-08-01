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
dek: One-sentence standfirst, shown in the feed and in the RSS feed.
date: 2026-05-27
tags: [skill, claude-code, mcp]
draft: false
---

Body starts here. The first line of the first paragraph is set in small caps.
```

Set `draft: true` to keep a post out of the build.

### Categories are tags

Everything is a post and each one carries exactly one category tag. The whole
list lives in `site.config.mjs`:

```js
categories: ['skill', 'agents', 'talks', 'research']
```

The feed's filter bar shows all of them in that order, **including empty ones**
(dimmed, with a count of zero), so a category can exist before it has anything
in it. Every category gets a page at `/tags/<tag>/` either way. The chips are
real links, so filtering works with JavaScript off; with it on they filter the
list in place and put the tag in the URL hash.

### What the markdown supports

| You write | You get |
| --- | --- |
| ` ```python ` | Shiki highlighting, applied at build time, dual-themed |
| `$x^2$` / `$$…$$` | KaTeX, rendered at build time — no client-side math JS |
| `[^note]` + `[^note]: text` | A margin note, floated into the right gutter on wide screens and collapsible inline on narrow ones |
| `![caption](img.png)` alone in a paragraph | A `<figure>` with the alt text as its caption |
| `[caption](youtube url)` alone in a paragraph | A click-to-load video: thumbnail facade now, `youtube-nocookie` iframe once you press play. `?t=490s` is preserved as a start time |
| `[caption](spotify episode url)` alone in a paragraph | A click-to-load Spotify player, same contract |
| `[caption](/video/thing.mp4)` alone in a paragraph | A self-hosted `<video>`, using `/video/thing.jpg` as its poster |
| `@diagram(name) Caption` on its own line | Inlines `static/diagrams/name.svg` so the drawing can use `.dg-stroke` / `.dg-accent` / `.dg-text` and follow the theme |
| `/feed.xml` | Root-relative links get the site's base path applied automatically |
| `## Heading` | An anchor link plus a margin section number |

Three or more `##` headings in a post generate a table of contents.

## Layout

```
site.config.mjs         title, author, base path, featured tags — the only place these live
build.mjs               the whole build: posts + pages -> dist/
serve.mjs               dev server, rebuilds on change
lib/markdown.mjs        marked + KaTeX + Shiki + sidenotes
lib/content.mjs         frontmatter, slugs, dates, tags, sections, reading time
lib/templates.mjs       every page shape
lib/feed.mjs            RSS, sitemap, robots.txt
posts/                  YYYY-MM-DD-slug.md
pages/                  standalone pages (about.md -> /about/)
static/                 copied verbatim: css, js, portrait.jpg + tonoff.jpg, images/, video/, diagrams/
```

Generated on every build: the home page, one page per post, `/feed/`, `/tags/`
plus a page per tag, `404.html`, `feed.xml`, `sitemap.xml`, `robots.txt`, and
`.nojekyll`.

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
are on. It reflects the OS preference until you flick it, then remembers — and
flipping it renames the site (Tonon → Tonoff, in the masthead, the hero and the
footer) and swaps the portrait for the lights-off one. All of that is CSS: both
halves are in the markup and the theme decides which is displayed.

Client-side JavaScript does three things and nothing else: the switch, the feed
filter, and swapping a video facade for an iframe when you press play. The
reading-progress bar, the margin-note layout, the staggered page load and the
theme itself are all CSS.
