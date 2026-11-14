import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { emitFilesystem, emitIR, emitMarkdown, parseFilesystem, parseIR, parseMarkdown } from '../src/index.js'
import type { IRNode } from '../src/index.js'
import { assertEqualsIR } from './testing.js'

describe('conversion API', () => {
  it('converts IR to Markdown through the CLI', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '-4', 'ir', '-2', 'md'], {
      input: JSON.stringify({ children: { ordered: true, items: [{ title: 'Hello', content: 'world' }] } }),
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.stdout, '# Hello\n\nworld')
  })
  it('emits and parses a Markdown hierarchy', () => {
    const document = parseMarkdown('Intro\n\n# Parent\n\ntext\n\n## Child\n\nmore\n\n# Sibling')
    assert.equal(emitMarkdown(document), 'Intro\n\n# Parent\n\ntext\n\n## Child\n\nmore\n\n# Sibling')
    assert.deepEqual(JSON.parse(emitIR(parseIR(emitIR(document)))), JSON.parse(emitIR(document)))
  })

  it('rejects unnamed nodes and supports opt-in deep headings', () => {
    const anonymous = parseIR('{"children":{"ordered":true,"items":[{}]}}')
    assert.throws(() => emitMarkdown(anonymous), /untitled/)
    let root = { title: 'seven' }
    for (let i = 0; i < 6; i++) root = { title: 'parent', children: { ordered: true, items: [root] } } as typeof root
    const document = { ...anonymous, root }
    assert.throws(() => emitMarkdown(document), /exceeds six/)
    assert.match(emitMarkdown(document, { html: true }), /<div role="heading" aria-level="7">seven<\/div>/)
  })

  it('round-trips a range of ordered Markdown trees including deep HTML headings', () => {
    for (let depth = 1; depth <= 10; depth++) {
      let node: IRNode = { title: 'Deep & <tag> "quoted" &amp;\nnext\rline', content: 'leaf content' }
      if (depth <= 6) node.title = 'Leaf'
      for (let level = depth - 1; level >= 1; level--) {
        node = {
          title: `Level ${level}`,
          content: `content ${level}`,
          children: { ordered: true, items: [node, { title: `Sibling ${level}`, content: 'sibling content' }] },
        }
      }
      const root: IRNode = {
        content: 'introduction',
        children: { ordered: true, items: [node, { title: 'Other root', content: 'end' }] },
      }
      const original = { ...parseIR('{}'), root }
      const markdown = emitMarkdown(original, { html: true })
      assertEqualsIR(parseMarkdown(markdown, { html: true }).root, root)
    }
  })

  it('recognizes generated HTML headings only when opted in', () => {
    const heading = '<div role="heading" aria-level="7">A &amp; B</div>'
    assert.equal(parseMarkdown(heading).root.content, heading)
    assert.equal(parseMarkdown(heading, { html: true, depth: 5 }).root.content, heading)
    assertEqualsIR(parseMarkdown(heading, { html: true }).root, {
      children: { ordered: true, items: [{ title: 'A & B' }] },
    })
    for (const html of [
      '<div role="heading" aria-level="6">title</div>',
      '<div role="heading" aria-level="07">title</div>',
      '<div aria-level="7" role="heading">title</div>',
      '<div role="heading" aria-level="7" class="x">title</div>',
      '<div role="heading" aria-level="7"><em>title</em></div>',
      '<div role="heading" aria-level="7">A &#38; B</div>',
    ])
      assert.equal(parseMarkdown(html, { html: true }).root.content, html)
  })

  it('supports the input HTML option through the CLI', () => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '-4', 'md', '-2', 'ir', '--in-html'], {
      input: '<div role="heading" aria-level="7">deep</div>',
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(result.stdout), { children: { ordered: true, items: [{ title: 'deep' }] } })
  })

  it('rebases file headings and respects title policies', () => {
    const document = parseFilesystem({
      title: 'docs',
      children: new Map([
        ['one.md', '# one\n\n## Details\n\ntext'],
        ['two.md', 'body'],
      ]),
    })
    assert.equal(emitMarkdown(document), '# docs\n\n## one\n\n### Details\n\ntext\n\n## two\n\nbody')
    const mismatch = parseFilesystem({ title: 'file.md', children: '# Other\n\nbody' })
    assert.throws(() => emitMarkdown(mismatch), /does not match/)
    assert.equal(emitMarkdown(mismatch, { title: 'heading' }), '# Other\n\nbody')
    assert.equal(emitMarkdown(mismatch, { title: 'filename' }), '# file\n\nbody')
  })

  it('emits relative files and controls trailing newlines', () => {
    const document = parseMarkdown('# Title\n\nbody\n\n### Sub\n\ntext', { depth: 1 })
    assert.deepEqual(
      emitFilesystem(document, { relativeHeadings: true, trailingNewline: true }),
      new Map([['.', new Map([['Title.md', '# Title\n\nbody\n\n## Sub\n\ntext\n']])]])
    )
    assert.throws(
      () => emitFilesystem(document, { relativeHeadings: true, header: () => 'header' }),
      /cannot be combined/
    )
  })
})
