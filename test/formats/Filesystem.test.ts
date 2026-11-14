import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { emitFilesystem, parseFilesystem, parseIR } from '../../src/index.js'
import type { FSTree } from '../../src/index.js'

describe('Filesystem formatter', () => {
  it('places root content and children together', () => {
    const document = parseIR(
      '{"content":"intro","children":{"ordered":true,"items":[{"title":"A","content":"a"},{"title":"B","content":"b"}]}}'
    )
    assert.deepEqual(
      emitFilesystem(document),
      new Map([
        ['content.txt', 'intro'],
        ['A.txt', 'a'],
        ['B.txt', 'b'],
      ])
    )
  })

  it('uses a content file inside a section with children', () => {
    const document = parseIR(
      '{"children":{"ordered":true,"items":[{"title":"A","content":"a","children":{"ordered":true,"items":[{"title":"B","content":"b"}]}}]}}'
    )
    assert.deepEqual(
      emitFilesystem(document),
      new Map([
        [
          'A',
          new Map([
            ['content.txt', 'a'],
            ['B.txt', 'b'],
          ]),
        ],
      ])
    )
  })

  it('checks ordering and can encode numeric prefixes', () => {
    const document = parseIR(
      '{"children":{"ordered":true,"items":[{"title":"Z","content":"z"},{"title":"A","content":"a"}]}}'
    )
    assert.throws(() => emitFilesystem(document), /order differs/)
    const tree = emitFilesystem(document, { order: 'nums' })
    assert.deepEqual(
      tree,
      new Map([
        ['1 Z.txt', 'z'],
        ['2 A.txt', 'a'],
      ])
    )
    const parsed = parseFilesystem({ title: 'dir', children: tree }, { order: 'nums' })
    assert.deepEqual(
      parsed.root.children?.items.map(node => node.title),
      ['Z', 'A']
    )
    assert.equal(parsed.root.children?.ordered, true)
    assert.equal(parseFilesystem({ title: 'dir', children: tree }, { order: 'ignore' }).root.children?.ordered, false)
  })

  it('reports each adjacent ordering conflict and its containing directory', () => {
    const document = parseIR(
      '{"children":{"ordered":true,"items":[{"title":"Parent","children":{"ordered":true,"items":[{"title":"Z","content":"z"},{"title":"B","content":"b"},{"title":"A","content":"a"}]}}]}}'
    )
    assert.throws(
      () => emitFilesystem(document),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /in "Parent"/)
        assert.match(error.message, /"Z" \("Z.txt"\) before "B" \("B.txt"\)/)
        assert.match(error.message, /"B" \("B.txt"\) before "A" \("A.txt"\)/)
        return true
      }
    )
  })

  it('requires numeric prefixes of consistent width and detects duplicates', () => {
    for (const tree of [
      new Map([['A.md', 'a']]),
      new Map([
        ['1 A.md', 'a'],
        ['02 B.md', 'b'],
      ]),
      new Map([
        ['1 A.md', 'a'],
        ['1 B.md', 'b'],
      ]),
    ]) {
      assert.throws(() => parseFilesystem({ title: 'dir', children: tree }, { order: 'nums' }))
    }
  })

  it('uses the minimum numeric width for each sibling group', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ title: `Section ${i}`, content: 'x' }))
    const tree = emitFilesystem(parseIR(JSON.stringify({ children: { ordered: true, items } })), {
      order: 'nums',
    }) as Map<string, FSTree>
    assert.ok(tree.has('01 Section 0.txt'))
    assert.ok(tree.has('10 Section 9.txt'))
    assert.equal(parseFilesystem({ title: 'dir', children: tree }, { order: 'nums' }).root.children?.items.length, 10)
  })

  it('detects content ambiguity and permits an explicit content filename', () => {
    const tree = new Map([
      ['content.md', 'a'],
      ['content.txt', 'b'],
    ])
    assert.throws(() => parseFilesystem({ title: 'dir', children: tree }))
    const parsed = parseFilesystem({ title: 'dir', children: tree }, { contentFilename: 'content.md' })
    assert.equal(parsed.root.content, 'a')
    assert.equal(parsed.root.children?.items[0].title, 'content')
  })

  it('rejects unsafe names, reserved content names, and collisions', () => {
    for (const title of ['bad/name', 'content']) {
      const document = parseIR(JSON.stringify({ children: { ordered: true, items: [{ title, content: 'x' }] } }))
      assert.throws(() => emitFilesystem(document))
    }
    const document = parseIR(
      '{"children":{"ordered":true,"items":[{"title":"A","content":"x"},{"title":"A","content":"y"}]}}'
    )
    assert.throws(() => emitFilesystem(document), /collision/)
  })

  it('strips a symmetric custom header and ensures final newlines', () => {
    const document = parseIR('{"children":{"ordered":true,"items":[{"title":"A","content":"a"}]}}')
    const options = { header: (title: string | undefined) => `${title}:`, trailingNewline: true }
    const tree = emitFilesystem(document, options)
    assert.deepEqual(tree, new Map([['A.txt', 'A:a\n']]))
    assert.equal(parseFilesystem({ title: 'dir', children: tree }, options).root.children?.items[0].content, 'a\n')
  })

  it('rejects a missing configured header', () => {
    const tree: FSTree = new Map([['A.txt', 'body']])
    assert.throws(() => parseFilesystem({ title: 'dir', children: tree }, { header: () => 'header' }))
  })
})
