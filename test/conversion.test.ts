import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { emitFilesystem, emitIR, emitMarkdown, parseFilesystem, parseIR, parseMarkdown } from '../src/index.js'

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
