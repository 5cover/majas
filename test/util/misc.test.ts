import { preprocessOptionsArgs } from '../../src/util/misc.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('preprocessOptionsArgs', () => {
    it('should extract -i options and remove them from args', () => {
        const result = preprocessOptionsArgs(['-ifoo', 'bar', 'baz']);
        assert.deepEqual(result.input, { foo: 'bar' });
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['baz']);
    });

    it('should extract --in- options and remove them from args', () => {
        const result = preprocessOptionsArgs(['--in-bar', 'baz']);
        assert.deepEqual(result.input, { bar: 'baz' });
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, []);
    });

    it('should extract -o options and remove them from args', () => {
        const result = preprocessOptionsArgs(['-oformat', 'file.txt']);
        assert.deepEqual(result.output, { format: 'file.txt' });
        assert.deepEqual(result.input, {});
        assert.deepEqual(result.args, []);
    });

    it('should extract --out- options and remove them from args', () => {
        const result = preprocessOptionsArgs(['--out-type', 'json']);
        assert.deepEqual(result.output, { type: 'json' });
        assert.deepEqual(result.input, {});
        assert.deepEqual(result.args, []);
    });

    it('should assign value to previous option key', () => {
        const result = preprocessOptionsArgs(['-ifoo', 'bar', '-otype', 'baz']);
        assert.deepEqual(result.input, { foo: 'bar' });
        assert.deepEqual(result.output, { type: 'baz' });
        assert.deepEqual(result.args, []);
    });

    it("should stop processing options at '--'", () => {
        const result = preprocessOptionsArgs(['-ifoo', 'bar', '--', '-otype']);
        assert.deepEqual(result.input, { foo: 'bar' });
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['--', '-otype']);
    });

    it("should stop processing options at '--' but not arguments", () => {
        const result = preprocessOptionsArgs(['-ifoo', '--', 'baz']);
        assert.deepEqual(result.input, { foo: '--' });
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['baz']);
    });

    it('should handle mixed options and normal args', () => {
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

    it('should not modify args if no options present', () => {
        const result = preprocessOptionsArgs(['foo', 'bar']);
        assert.deepEqual(result.input, {});
        assert.deepEqual(result.output, {});
        assert.deepEqual(result.args, ['foo', 'bar']);
    });
});
