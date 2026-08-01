// Everything about "who this blog is" lives here. Nothing else should
// hardcode a name, a URL, or a path.

export const site = {
  title: 'Ablations',
  tagline: 'Notes on language models, learning, and measurement.',
  description:
    'A working notebook on language models, training dynamics, and the ' +
    'measurement problems that come with both.',

  author: {
    name: 'Lucas Tonon',
    email: 'tonon@vetto.ai',
    github: 'lucastononro',
  },

  // Where the site lives. `base` is the path prefix GitHub Pages serves the
  // repo under — set it to '' if you move this to a user site or a custom
  // domain, and every internal link follows.
  origin: 'https://lucastononro.github.io',
  base: '/ablations',

  lang: 'en',

  nav: [
    { label: 'Entries', href: '/' },
    { label: 'About', href: '/about/' },
    { label: 'Feed', href: '/feed.xml' },
  ],
}

/** Join a site-relative path onto the base path. `u('/about/')` -> '/ablations/about/' */
export function u(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${site.base}${p}`.replace(/\/{2,}/g, '/')
}

/** Absolute URL, for feeds, canonical tags, and social cards. */
export function abs(path = '/') {
  return `${site.origin}${u(path)}`
}
