import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { emitFilesystem, emitIR, emitMarkdown, parseFilesystem, parseIR, parseMarkdown } from '../src/index.js'
import type { FSTree, IRNode } from '../src/index.js'
import { assertEqualsIR } from './testing.js'

describe('conversion API', () => {
  it('splits and rebuilds the complete Markdown syntax tree through the CLI', () => {
    const source = 'Introduction.\n\n# Alpha\n\nFirst.\n\n### Detail\n\n- one\n- two\n\n# Beta\n\nSecond.'
    const dir = mkdtempSync(join(tmpdir(), 'majas-test-'))
    try {
      const split = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '-4', 'md', '-2', 'fs', '-o', dir], {
        input: source,
        encoding: 'utf8',
      })
      assert.equal(split.status, 0, split.stderr)
      assert.equal(readFileSync(join(dir, 'content.md'), 'utf8'), 'Introduction.')
      assert.equal(readFileSync(join(dir, 'Alpha', 'content.md'), 'utf8'), '# Alpha\n\nFirst.')
      const merge = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli.ts', '-4', 'fs', '-2', 'md', dir], {
        encoding: 'utf8',
      })
      assert.equal(merge.status, 0, merge.stderr)
      const ast = (input: string) =>
        JSON.parse(
          JSON.stringify(fromMarkdown(input), (key, value: unknown) => (key === 'position' ? undefined : value))
        ) as unknown
      assert.deepEqual(ast(merge.stdout), ast(source))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('uses matching numbering, content filename, and header options through the CLI', () => {
    const source = 'Intro\n\n# Z\n\nz\n\n# A\n\na'
    const dir = mkdtempSync(join(tmpdir(), 'majas-options-'))
    try {
      const split = spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          'src/cli.ts',
          '-4',
          'md',
          '-2',
          'fs',
          '-o',
          dir,
          '--out-order',
          'nums',
          '--out-content',
          'root.md',
          '--out-header',
          'PREFIX{n}',
        ],
        { input: source, encoding: 'utf8' }
      )
      assert.equal(split.status, 0, split.stderr)
      assert.equal(readFileSync(join(dir, 'root.md'), 'utf8'), 'PREFIX\nIntro')
      const merge = spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          'src/cli.ts',
          '-4',
          'fs',
          '-2',
          'md',
          dir,
          '--in-order',
          'nums',
          '--in-content',
          'root.md',
          '--in-header',
          'PREFIX{n}',
        ],
        { encoding: 'utf8' }
      )
      assert.equal(merge.status, 0, merge.stderr)
      assert.equal(merge.stdout, source)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('reverses the output newline option without changing internal Markdown newlines', () => {
    const source = 'Intro\n\n# Alpha\n\nFirst\n\n```\nline\n\nline\n```\n\n# Beta\n\nSecond'
    const dir = mkdtempSync(join(tmpdir(), 'majas-newline-'))
    try {
      const split = spawnSync(
        process.execPath,
        ['--import', 'tsx', 'src/cli.ts', '-4', 'md', '-2', 'fs', '-o', dir, '-onewline'],
        { input: source, encoding: 'utf8' }
      )
      assert.equal(split.status, 0, split.stderr)
      const merge = spawnSync(
        process.execPath,
        ['--import', 'tsx', 'src/cli.ts', '-4', 'fs', '-2', 'md', dir, '-inewline'],
        { encoding: 'utf8' }
      )
      assert.equal(merge.status, 0, merge.stderr)
      assert.equal(merge.stdout, source)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('round-trips unsorted and already-numbered headings with matching order options', () => {
    const source = '# 2 Beta\n\nSecond\n\n# 1 Alpha\n\nFirst'
    const document = parseMarkdown(source)
    assert.throws(() => emitFilesystem(document), /order differs/)
    const tree = emitFilesystem(document, { order: 'nums' })
    assert.deepEqual(Array.from((tree as Map<string, unknown>).keys()), ['1 2 Beta.md', '2 1 Alpha.md'])
    const rebuilt = emitMarkdown(parseFilesystem({ title: 'dir', children: tree }, { order: 'nums' }))
    assert.equal(rebuilt, source)
  })

  it('omits heading-only directory content when the heading is recoverable', () => {
    const input = '# Alpha\n\n## Beta\n\ntext'
    const tree = emitFilesystem(parseMarkdown(input))
    assert.deepEqual(tree, new Map([['Alpha', new Map([['Beta.md', '## Beta\n\ntext']])]]))
    assert.equal(emitMarkdown(parseFilesystem({ title: 'dir', children: tree })), input)
  })

  it('keeps a heading-only content file for skipped levels and noncanonical headings', () => {
    for (const input of ['# Alpha\n\n### Beta\n\n#### Child', '# Alpha\n\n## Beta ##\n\n### Child']) {
      const tree = emitFilesystem(parseMarkdown(input)) as Map<string, Map<string, FSTree>>
      const beta = tree.get('Alpha')?.get('Beta') as Map<string, FSTree>
      assert.ok(beta.has('content.md'))
      assert.equal(emitMarkdown(parseFilesystem({ title: 'dir', children: tree })), input)
    }
  })

  it('preserves inline heading structure when an explicit filename replacement is used', () => {
    const source = '# A *bold* title\n\nText\n\n### Empty'
    const tree = emitFilesystem(parseMarkdown(source), { invalidFilenameCharReplacement: '_' })
    const rebuilt = emitMarkdown(parseFilesystem({ title: 'dir', children: tree }), { title: 'heading' })
    const ast = (input: string) =>
      JSON.parse(
        JSON.stringify(fromMarkdown(input), (key, value: unknown) => (key === 'position' ? undefined : value))
      ) as unknown
    assert.deepEqual(ast(rebuilt), ast(source))
  })

  it('rejects removed or mismatched stored headings and accepts filename mode', () => {
    const tree = new Map([['Alpha.md', 'body']])
    const document = parseFilesystem({ title: 'dir', children: tree })
    assert.throws(() => emitMarkdown(document), /Missing section heading/)
    assert.equal(emitMarkdown(document, { title: 'filename' }), '# Alpha\n\nbody')
    tree.set('Alpha.md', '# Other\n\nbody')
    assert.throws(() => emitMarkdown(parseFilesystem({ title: 'dir', children: tree })), /does not match/)
  })

  it('round-trips generated deep HTML headings through the filesystem', () => {
    const input =
      '# A\n\n## B\n\n### C\n\n#### D\n\n##### E\n\n###### F\n\n<div role="heading" aria-level="7">G</div>\n\ntext'
    const document = parseMarkdown(input, { html: true })
    const tree = emitFilesystem(document)
    const output = emitMarkdown(parseFilesystem({ title: 'dir', children: tree }), { html: true })
    assert.equal(output, input)
  })

  it('preserves Markdown heading source in IR JSON', () => {
    const input = '# Title\n\n### Child\n\nbody'
    const ir = parseIR(emitIR(parseMarkdown(input)))
    assert.equal(emitMarkdown(ir), input)
  })
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
    assert.deepEqual(JSON.parse(result.stdout), {
      children: {
        ordered: true,
        items: [{ title: 'deep', headingSource: '<div role="heading" aria-level="7">deep</div>' }],
      },
    })
  })

  it('rebases file headings and respects title policies', () => {
    const document = parseFilesystem({
      title: 'docs',
      children: new Map([
        ['one.md', '# one\n\n## Details\n\ntext'],
        ['two.md', 'body'],
      ]),
    })
    assert.throws(() => emitMarkdown(document), /Missing section heading/)
    assert.equal(emitMarkdown(document, { title: 'filename' }), '# one\n\n## Details\n\ntext\n\n# two\n\nbody')
    const mismatch = parseFilesystem({ title: 'docs', children: new Map([['file.md', '# Other\n\nbody']]) })
    assert.throws(() => emitMarkdown(mismatch), /does not match/)
    assert.equal(emitMarkdown(mismatch, { title: 'heading' }), '# Other\n\nbody')
    assert.equal(emitMarkdown(mismatch, { title: 'filename' }), '# file\n\nbody')
  })

  it('emits relative files and controls trailing newlines', () => {
    const document = parseMarkdown('# Title\n\nbody\n\n### Sub\n\ntext', { depth: 1 })
    assert.deepEqual(
      emitFilesystem(document, { relativeHeadings: true, trailingNewline: true }),
      new Map([['Title.md', '# Title\n\nbody\n\n## Sub\n\ntext\n']])
    )
    assert.throws(
      () => emitFilesystem(document, { relativeHeadings: true, header: () => 'header' }),
      /cannot be combined/
    )
  })
})
