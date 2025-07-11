import test from 'node:test';
import * as assert from 'node:assert/strict';
import IR from '../../src/formats/IR.js';
import { defineNode } from '../../src/core/IRNode.js';
import ParseError from '../../src/core/ParseError.js';

// Nominal

test('IR parses a minimal JSON tree', () => {
    const json = `{
    "title": "root",
    "children": [],
    "childrenOrdered": false
  }`;

    const ir = new IR();
    const doc = ir.parse(json);

    assert.deepEqual(
        doc.root,
        defineNode({
            title: 'root',
        })
    );
});

test('IR round-trips cleanly with write + parse', () => {
    const original = {
        title: 'section',
        content: 'hello',
        children: [defineNode({ title: 'child', content: 'world' })],
        childrenOrdered: true,
    };

    const ir = new IR();
    const printed = ir.write({ root: original, format: ir });
    const parsed = ir.parse(printed);

    assert.deepEqual(parsed.root, original);
});

// Error

test('IR throws ParseError on invalid JSON syntax', () => {
    const ir = new IR();
    const input = `{ title: "no quotes" }`; // malformed JSON

    assert.throws(() => ir.parse(input), ParseError);
});

test('IR throws ParseError on invalid IR shape', () => {
    const ir = new IR();
    const input = JSON.stringify({
        title: 'missing children and childrenOrdered',
    });

    assert.throws(() => ir.parse(input), ParseError);
});
