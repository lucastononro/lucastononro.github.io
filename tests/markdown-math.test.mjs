import test from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../lib/markdown.mjs'

test('inline math keeps trailing punctuation with the expression', () => {
  for (const punctuation of ['.', ',', ';', ':', '!', '?']) {
    const { html } = renderMarkdown(`Parameters $\\theta$${punctuation} Next sentence.`)
    assert.ok(html.includes('class="math-inline"'))
    assert.ok(html.includes(`${punctuation}</span> Next sentence.`))
    assert.ok(html.includes('<annotation encoding="application/x-tex">\\theta</annotation>'))
  }
})

test('math punctuation preserves adjacent emphasis, links and display equations', () => {
  const { html } = renderMarkdown('**$x$.** [$y$,](https://example.com) $z$ remains.\n\n$$\nx=y.\n$$')
  assert.match(html, /\.<\/span><\/strong>/)
  assert.match(html, /,<\/span><\/a>/)
  assert.match(html, /<\/span> remains\./)
  assert.equal((html.match(/class="math-inline"/g) || []).length, 3)
  assert.equal((html.match(/class="math-block"/g) || []).length, 1)
})
