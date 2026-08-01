import { site, u, abs } from '../site.config.mjs'
import { escapeHtml } from './markdown.mjs'

function rfc822(iso) {
  // Posts are dated, not timestamped. Noon UTC keeps every reader's local
  // date the same as the one on the page.
  return new Date(`${iso}T12:00:00Z`).toUTCString()
}

export function rssFeed(posts, buildDate) {
  const items = posts
    .map((post) => `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${abs(post.href)}</link>
      <guid isPermaLink="true">${abs(post.href)}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <description>${escapeHtml(post.dek || post.excerpt)}</description>
${post.tags.map((t) => `      <category>${escapeHtml(t)}</category>`).join('\n')}
      <content:encoded><![CDATA[${post.html.replace(/]]>/g, ']]&gt;')}]]></content:encoded>
    </item>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(site.title)}</title>
    <link>${abs('/')}</link>
    <atom:link href="${abs('/feed.xml')}" rel="self" type="application/rss+xml"/>
    <description>${escapeHtml(site.description)}</description>
    <language>${site.lang}</language>
    <managingEditor>${site.author.email} (${escapeHtml(site.author.name)})</managingEditor>
    <lastBuildDate>${buildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`
}

export function sitemap(paths, buildIso) {
  const urls = paths
    .map((p) => `  <url><loc>${abs(p)}</loc><lastmod>${buildIso}</lastmod></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

export function robots() {
  return `User-agent: *
Allow: /
Sitemap: ${abs('/sitemap.xml')}
`
}

export { u }
