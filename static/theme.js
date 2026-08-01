// Two small jobs: run the Tonon/Tonoff switch, and make sidenote markers
// keyboard-operable. Everything else on this site is CSS.

(() => {
  const root = document.documentElement

  const systemPrefersDark = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches

  // The effective theme, whether it came from a click or from the OS.
  const current = () =>
    root.dataset.theme || (systemPrefersDark() ? 'dark' : 'light')

  const sw = document.querySelector('.tonon')
  if (sw) {
    const sync = () => {
      const on = current() === 'light'
      // Pressed = lights on = Tonon.
      sw.setAttribute('aria-pressed', String(on))
      sw.setAttribute('aria-label', on ? 'Tonon: lights are on. Switch to dark.'
                                       : 'Tonoff: lights are off. Switch to light.')
    }
    sync()
    sw.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark'
      root.dataset.theme = next
      try { localStorage.setItem('theme', next) } catch {}
      sync()
    })
    // Follow the OS until someone actually flicks the switch.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!root.dataset.theme) sync()
    })
  }

  // Sidenote markers are <label>s, which mice can click but keyboards cannot.
  for (const ref of document.querySelectorAll('.sn-ref')) {
    ref.setAttribute('role', 'button')
    ref.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const box = document.getElementById(ref.htmlFor)
        if (box) box.checked = !box.checked
      }
    })
  }
})()
