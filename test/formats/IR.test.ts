import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import ParseError from '../../src/core/ParseError.js';
import formats from '../../src/core/formats.js';
import { mkIR } from '../../src/core/IRNode.js';
import type IRNode from '../../src/core/IRNode.js';
import IR from '../../src/formats/IR.js';

// Nominal

const irFormat = formats[0];
const ir = new IR(irFormat);
describe('IR formatter', () => {
    it('parses a minimal JSON tree', () => {
        const json = `{
    "title": "root"
  }`;

        const doc = ir.parse(json);

        assert.deepEqual(
            doc.root,
            mkIR({
                title: 'root',
            })
        );
    });

    it('round-trips cleanly with write + parse', () => {
        const original: IRNode = {
            title: 'section',
            content: 'hello',
            children: { ordered: true, items: [mkIR({ title: 'child', content: 'world' })] },
        };

        const printed = ir.emit({ root: original, format: irFormat });
        const parsed = ir.parse(printed);

        assert.deepEqual(parsed.root, original);
    });

    // Error

    it('throws ParseError on invalid JSON syntax', () => {
        const input = `{ title: "no quotes" }`; // malformed JSON

        assert.throws(() => ir.parse(input), ParseError);
    });

    it('throws ParseError on invalid IR shape', () => {
        const input = JSON.stringify({
            title: 'missing children ordered',
            children: {
                items: [],
            },
        });

        assert.throws(() => ir.parse(input), ParseError);
    });
});
