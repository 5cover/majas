import { describe, it } from 'node:test';
import formats from '../../src/core/formats.js';
import assert from 'node:assert/strict';
import Filesystem from '../../src/formats/Filesystem.js';
import type { FSTree } from '../../src/fstree.js';

const formatter = new Filesystem(formats[2]);
const testFormat = formats[0];
/*
RULES to test for Filesystem

- parse

IRNode from FSTreeNode n
    title: n.title
    content: n.children if n.children is a string
    children: IRNode from FSTreeNode m foreach n.children m

- emit

IRNode n:

- if it has content: create file <n.title ?? ''>.<n.format.fileExtensions[0] ?? 'txt'>
- if it has children: 
    - create directory (<n.title ?? index>)
        - fill it with the same algorithm
*/

describe('Filesystem formatter', () => {
    it('parses an empty node', () => {
        assert.deepEqual(
            formatter.emit({
                format: testFormat,
                root: {},
            }),
            {
                title: 'out',
                children: new Map<string, FSTree>(),
            }
        );
    });
});
