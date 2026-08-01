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
   * Categories. A post picks one with `section: <slug>` in its frontmatter;
   * anything without one lands in `defaultSection`. Each section that has at
   * least one post gets a page at /<slug>/ and a slot in the nav — so adding a
   * category is one entry here plus a post.
   */
  sections: [
    {
      slug: 'skills',
      title: 'Skills',
      blurb:
        'Things I built for coding agents, and why each one exists. All of ' +
        'them are installable, and all of them started as a specific annoyance.',
    },
    {
      slug: 'notes',
      title: 'Notes',
      blurb: 'Shorter things that did not need a repository.',
    },
  ],
  defaultSection: 'notes',
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

export function sectionOf(slug) {
  return site.sections.find((s) => s.slug === slug)
}
