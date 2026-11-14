import assert from 'node:assert/strict'
import type IRNode from '../src/core/IRNode.js'
import { normalize } from '../src/core/IRNode.js'

export function assertEqualsIR(actual: IRNode, expected: IRNode, log = false) {
  const removeSource = (node: IRNode) => {
    delete node.headingSource
    node.children?.items.forEach(removeSource)
  }
  removeSource(actual)
  removeSource(expected)
  actual = normalize(actual)
  expected = normalize(expected)
  if (log) [actual, expected].forEach(x => console.dir(x, { depth: null }))
  assert.deepEqual(actual, expected)
}
