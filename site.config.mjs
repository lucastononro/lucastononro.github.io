// Everything about "who this blog is" lives here. Nothing else should
// hardcode a name, a URL, or a path.

export const site = {
  title: 'Tonon Journey',
  tagline: 'Notes from the journey — mostly detours.',
  description:
    'Lucas Tonon builds tools for coding agents and writes down what ' +
    'happened. Skills, experiments, and the occasional evening lost to a ' +
    'shell script.',

  author: {
    name: 'Lucas Tonon',
    // Straight from the GitHub profile — edit here, not in the templates.
    bio:
      'AI engineer working on machine learning, data science, software ' +
      'engineering and research. Enjoys math and pizza.',
    email: 'tonon@vetto.ai',
    github: 'lucastononro',
  },

  // Where the site lives. `base` is the path prefix — empty for a user site
  // or a custom domain. Every internal link, the feed and the sitemap follow
  // from these two fields.
  origin: 'https://lucastononro.github.io',
  base: '',

  lang: 'en',
  launchYear: 2026,

  /**
   * Categories are just tags. Every post is a post; `skill` marks the ones
   * with an installable repository behind them. These tags get pinned to the
   * front of the feed's filter bar, in this order — anything else follows by
   * post count. Reorder freely; a tag nobody uses is skipped.
   */
  featuredTags: ['skill', 'project', 'agents', 'claude-code'],

  /** Which tag the "Skills" nav link points at. */
  skillTag: 'skill',
}

/** Join a site-relative path onto the base path. */
export function u(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${site.base}${p}`.replace(/\/{2,}/g, '/')
}

/** Absolute URL, for feeds, canonical tags, and social cards. */
export function abs(path = '/') {
  return `${site.origin}${u(path)}`
}

/**
 * Filter-bar order: pinned tags first (only the ones in use), then whatever
 * is left, most-used first.
 */
export function orderedTags(tagMap) {
  const pinned = site.featuredTags.filter((t) => tagMap.has(t))
  const rest = [...tagMap.keys()].filter((t) => !pinned.includes(t))
  return [...pinned, ...rest].slice(0, 8)
}
