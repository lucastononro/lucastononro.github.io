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
   * Categories are tags. Every post carries exactly one. These are the only
   * ones — the filter bar shows all of them in this order, including empty
   * ones, so a category can exist before it has anything in it.
   */
  categories: ['skill', 'agents', 'talks', 'research'],

  /** Which category the nav link points at. */
  navCategory: 'skill',
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

/** Every declared category with its post count, empty ones included. */
export function categoryCounts(tagMap) {
  return site.categories.map((slug) => ({ slug, count: (tagMap.get(slug) || []).length }))
}
