import { uniqify } from '../../src/util/string.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('uniqify', () => {
    it('returns the original string if it is already unique', () => {
        const inCrowd = () => false;
        assert.equal(uniqify('test', inCrowd), 'test');
    });

    it('appends (1) if the original string is not unique', () => {
        const inCrowd = (candidate: string) => candidate === 'test';
        assert.equal(uniqify('test', inCrowd), 'test (1)');
    });

    it('increments the suffix until a unique string is found', () => {
        const taken = new Set(['test', 'test (1)', 'test (2)']);
        assert.equal(
            uniqify('test', s => taken.has(s)),
            'test (3)'
        );
    });

    it('works with empty string', () => {
        const taken = new Set(['', ' (1)']);
        assert.equal(
            uniqify('', s => taken.has(s)),
            ' (2)'
        );
    });

    it('works with strings containing numbers or parentheses', () => {
        const taken = new Set(['foo (1)', 'foo (1) (1)']);
        assert.equal(
            uniqify('foo (1)', s => taken.has(s)),
            'foo (1) (2)'
        );
    });

    it('returns the first available unique string', () => {
        const taken = new Set(['a', 'a (1)', 'a (2)', 'a (4)']);
        assert.equal(
            uniqify('a', s => taken.has(s)),
            'a (3)'
        );
    });
});
