import { preprocessOptionsArgs } from '../../src/util/misc.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('preprocessOptionsArgs', () => {
    it('extracts -i options and remove them from args', () => {
        const result = preprocessOptionsArgs(['-ifoo', 'bar', 'baz']);
        assert.deepEqual(result.input, { foo: 'bar' });
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['baz']);
    });

    it('extracts --in- options and remove them from args', () => {
        const result = preprocessOptionsArgs(['--in-bar', 'baz']);
        assert.deepEqual(result.input, { bar: 'baz' });
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, []);
    });

    it('extracts -o options and remove them from args', () => {
        const result = preprocessOptionsArgs(['-oformat', 'file.txt']);
        assert.deepEqual(result.output, { format: 'file.txt' });
        assert.deepEqual(result.input, {});
        assert.deepEqual(result.args, []);
    });

    it('ignores bare prefixes', () => {
        const result = preprocessOptionsArgs(['-i', '-o', '--in-', '--out-']);
        assert.deepEqual(result.input, {});
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['-i', '-o', '--in-', '--out-']);
    });

    it('treats all options', () => {
        const result = preprocessOptionsArgs(['-i1', '-o1', '--in-2', '--out-2']);
        assert.deepEqual(result.input, { '1': true, '2': true });
        assert.deepEqual(result.output, { '1': true, '2': true });
        assert.deepEqual(result.args, []);
    });

    it('parses numric arguments properly', () => {
        const result = preprocessOptionsArgs([
            '-i1',
            '0',
            '-i2',
            '5',
            '-i3',
            '+19',
            '-i4',
            '47',
            'i5',
            '483.15',
            'i6',
            '.17',
            '-i7',
            'Infinity',
            '-i8',
            '--',
            '-43.4',
        ]);
        assert.deepEqual(result.input, {
            '1': 0,
            '2': 5,
            '3': 19,
            '4': 45,
            '5': 483.15,
            '6': 0.17,
            '7': Infinity,
            '8': -43.4,
        });
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['--']);
    });

    it('extracts --out- options and remove them from args', () => {
        const result = preprocessOptionsArgs(['--out-type', 'json']);
        assert.deepEqual(result.output, { type: 'json' });
        assert.deepEqual(result.input, {});
        assert.deepEqual(result.args, []);
    });

    it('assigns value to previous option key', () => {
        const result = preprocessOptionsArgs(['-ifoo', 'bar', '-otype', 'baz']);
        assert.deepEqual(result.input, { foo: 'bar' });
        assert.deepEqual(result.output, { type: 'baz' });
        assert.deepEqual(result.args, []);
    });

    it("stops processing options at '--'", () => {
        const result = preprocessOptionsArgs(['-ifoo', 'bar', '--', '-otype']);
        assert.deepEqual(result.input, { foo: 'bar' });
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['--', '-otype']);
    });

    it("stops processing options at '--' but not arguments", () => {
        const result = preprocessOptionsArgs(['-ifoo', '--', 'baz']);
        assert.deepEqual(result.input, { foo: '--' });
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['baz']);
    });

    it('handles mixed options and normal args', () => {
        const result = preprocessOptionsArgs([
            '-ifoo',
            'bar',
            'input.txt',
            '-otype',
            'baz',
            'output.txt',
        ]);
        assert.deepEqual(result.input, { foo: 'bar' });
        assert.deepEqual(result.output, { type: 'baz' });
        assert.deepEqual(result.args, ['input.txt', 'output.txt']);
    });

    it("doesnt' modify args if no options present", () => {
        const result = preprocessOptionsArgs(['foo', 'bar']);
        assert.deepEqual(result.input, {});
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['foo', 'bar']);
    });
});
