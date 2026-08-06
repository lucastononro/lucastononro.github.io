// Three small jobs: the Tonon/Tonoff switch, filtering the feed, and loading a
// YouTube player only once someone asks for it. Everything else here is CSS.

(() => {
  const root = document.documentElement

  // -- Tonon / Tonoff -------------------------------------------------------

  const systemPrefersDark = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches

  // The effective theme, whether it came from a click or from the OS.
  const current = () =>
    root.dataset.theme || (systemPrefersDark() ? 'dark' : 'light')

  // Filled in by the comments block below, if this page has one.
  let paintComments = () => {}

  const switches = [...document.querySelectorAll('.tonon')]
  if (switches.length) {
    const sync = () => {
      const on = current() === 'light'
      for (const sw of switches) {
        // Pressed = lights on = Tonon.
        sw.setAttribute('aria-pressed', String(on))
        sw.setAttribute('aria-label', on ? 'Tonon: lights are on. Switch to dark.'
                                         : 'Tonoff: lights are off. Switch to light.')
      }
      paintComments()
    }
    sync()
    for (const sw of switches) {
      sw.addEventListener('click', () => {
        const next = current() === 'dark' ? 'light' : 'dark'
        root.dataset.theme = next
        try { localStorage.setItem('theme', next) } catch {}
        sync()
      })
    }
    // Follow the OS until someone actually flicks the switch.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!root.dataset.theme) sync()
    })
  }

  // -- Comments -------------------------------------------------------------
  //
  // giscus lives in an iframe and cannot see the page's CSS, so it gets its own
  // stylesheet by URL — one per theme, both written by the build. The script is
  // injected rather than sitting in the HTML so the frame opens in the right
  // theme rather than flashing the wrong one, and so nothing reaches
  // giscus.app on pages without a comment section.

  const mount = document.querySelector('[data-giscus]')
  if (mount) {
    const { themeLight, themeDark, ...config } = mount.dataset
    const themeFor = () => (current() === 'dark' ? themeDark : themeLight)

    const script = document.createElement('script')
    script.src = 'https://giscus.app/client.js'
    script.crossOrigin = 'anonymous'
    script.async = true
    Object.assign(script.dataset, {
      repo: config.repo,
      repoId: config.repoId,
      category: config.category,
      categoryId: config.categoryId,
      mapping: config.mapping,
      lang: config.lang,
      // Refuse to bind a thread to anything but this exact page.
      strict: '1',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'top',
      theme: themeFor(),
      // Nothing is fetched until the reader is near the bottom of the post.
      loading: 'lazy',
    })
    mount.appendChild(script)

    // Repaint on every flick of the switch. The frame only exists once giscus
    // has loaded, so this is a no-op until then — which is fine, because it
    // opens in the current theme anyway.
    paintComments = () => {
      const frame = document.querySelector('iframe.giscus-frame')
      frame?.contentWindow?.postMessage(
        { giscus: { setConfig: { theme: themeFor() } } },
        'https://giscus.app',
      )
    }
  }

  // -- Feed filter ----------------------------------------------------------
  //
  // The chips are real links to tag pages, so this is an upgrade rather than a
  // requirement: with JS off you navigate, with JS on you filter in place.

  const feed = document.querySelector('[data-filterable]')
  const chips = [...document.querySelectorAll('.filter-chip')]
  if (feed && chips.length) {
    const entries = [...feed.querySelectorAll('.entry')]
    const count = document.querySelector('[data-filter-count]')

    const apply = (tag) => {
      let shown = 0
      for (const entry of entries) {
        const match = !tag || (entry.dataset.tags || '').split(' ').includes(tag)
        entry.hidden = !match
        if (match) shown++
      }
      for (const chip of chips) {
        if (chip.dataset.tag === (tag || '')) chip.setAttribute('aria-current', 'true')
        else chip.removeAttribute('aria-current')
      }
      // Hide year headings that no longer have anything under them.
      for (const year of feed.querySelectorAll('.year')) {
        year.hidden = ![...year.querySelectorAll('.entry')].some((e) => !e.hidden)
      }
      if (count) {
        count.textContent = tag
          ? `${shown} of ${entries.length}`
          : ''
      }
    }

    for (const chip of chips) {
      chip.addEventListener('click', (event) => {
        event.preventDefault()
        const tag = chip.dataset.tag
        history.replaceState(null, '', tag ? `#${tag}` : location.pathname)
        apply(tag)
      })
    }

    const fromHash = decodeURIComponent(location.hash.slice(1))
    apply(chips.some((c) => c.dataset.tag === fromHash) ? fromHash : '')
  }

  // -- Click-to-load video --------------------------------------------------
  //
  // Nothing is requested from youtube.com until the play button is pressed, so
  // the "no cookies" line in the footer stays true.

  document.addEventListener('click', (event) => {
    const audio = event.target.closest?.('.audio-embed')
    if (audio) {
      const frame = document.createElement('iframe')
      frame.className = 'audio-frame'
      frame.src = `https://open.spotify.com/embed/${audio.dataset.spotify}`
      frame.title = audio.getAttribute('aria-label') || 'Spotify player'
      frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
      frame.loading = 'lazy'
      audio.replaceWith(frame)
      return
    }

    const button = event.target.closest?.('.video-embed')
    if (!button) return

    const { yt, start } = button.dataset
    const params = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1' })
    if (Number(start) > 0) params.set('start', start)

    const frame = document.createElement('iframe')
    frame.className = 'video-frame'
    frame.src = `https://www.youtube-nocookie.com/embed/${yt}?${params}`
    frame.title = button.getAttribute('aria-label') || 'Video'
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    frame.allowFullscreen = true
    button.replaceWith(frame)
  })

  // -- Sidenotes ------------------------------------------------------------

  // Sidenote markers are <label>s, which mice can click but keyboards cannot.
  for (const ref of document.querySelectorAll('.sn-ref')) {
    ref.setAttribute('role', 'button')
    ref.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const box = document.getElementById(ref.htmlFor)
        if (box) box.checked = !box.checked
      }
    })
  }
})()
