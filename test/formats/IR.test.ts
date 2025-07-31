import test from 'node:test';
import * as assert from 'node:assert/strict';
import IR from '../../src/formats/IR.js';
import IRNode, { mkIR } from '../../src/core/IRNode.js';
import ParseError from '../../src/core/ParseError.js';

// Nominal

test('IR parses a minimal JSON tree', () => {
    const json = `{
    "title": "root"
  }`;

    const ir = new IR();
    const doc = ir.parse(json);

    assert.deepEqual(
        doc.root,
        mkIR({
            title: 'root',
        })
    );
});

test('IR round-trips cleanly with write + parse', () => {
    const original: IRNode = {
        title: 'section',
        content: 'hello',
        children: { ordered: true, items: [mkIR({ title: 'child', content: 'world' })]},
    };

    const ir = new IR();
    const printed = ir.emit({ root: original, format: ir });
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
        title: 'missing children ordered',
        children: {
            items: []
        }
    });

    assert.throws(() => ir.parse(input), ParseError);
});
