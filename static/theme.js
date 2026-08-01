// Two small jobs: persist the theme choice, and make sidenote markers
// keyboard-operable. Everything else on this site is CSS.

(() => {
  const root = document.documentElement

  const systemPrefersDark = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches

  const current = () =>
    root.dataset.theme || (systemPrefersDark() ? 'dark' : 'light')

  const toggle = document.querySelector('.theme-toggle')
  if (toggle) {
    const sync = () => {
      toggle.setAttribute('aria-label', `Switch to ${current() === 'dark' ? 'light' : 'dark'} theme`)
    }
    sync()
    toggle.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark'
      root.dataset.theme = next
      try { localStorage.setItem('theme', next) } catch {}
      sync()
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
