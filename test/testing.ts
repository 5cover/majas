import assert from 'node:assert/strict';
import type IRNode from '../src/core/IRNode.js';
import { normalize } from '../src/core/IRNode.js';

export function assertEqualsIR(actual: IRNode, expected: IRNode) {
    assert.deepEqual(normalize(actual), normalize(expected));
}
