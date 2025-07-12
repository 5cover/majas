// This import must come before other so the mock is applied
import { fs, volume } from './testfs.js';

import test from 'node:test';
import assert from 'node:assert/strict';
import p from 'path';
import * as t from '../src/fstree.js';

/** encoding to use */
const enc = 'utf8';

test('write creates a simple file tree', () => {
    const tempDir = p.resolve('test-output');
    const tree: t.FSTree = new Map<string, t.FSTree>([
        ['file1.txt', 'content1'],
        ['dir1', new Map([['file2.txt', 'content2']])],
    ]);

    t.write(tree, tempDir);

    assert.equal(fs.readFileSync(p.resolve(tempDir, 'file1.txt'), enc), 'content1');
    assert.equal(fs.readFileSync(p.resolve(tempDir, 'dir1', 'file2.txt'), enc), 'content2');
});

test('read loads a file tree correctly', () => {
    volume.fromNestedJSON({
        'test-input': {
            'test.txt': 'hello',
            subdir: {
                'nested.txt': 'world',
            },
        },
    });

    const result = t.read('test-input', enc);

    assert.ok(result instanceof Map);
    assert.equal(result.get('test.txt'), 'hello');
    const subdir = result.get('subdir');
    assert.ok(subdir instanceof Map);
    assert.equal(subdir.get('nested.txt'), 'world');
});

test('write handles empty directories', () => {
    const tempDir = p.resolve('test-empty');
    const tree: t.FSTree = new Map([['emptyDir', new Map()]]);

    t.write(tree, tempDir);

    assert.ok(fs.existsSync(p.resolve(tempDir, 'emptyDir')));
    assert.ok(fs.statSync(p.resolve(tempDir, 'emptyDir')).isDirectory());
});

test('read handles empty directories', () => {
    volume.fromNestedJSON({
        'test-empty-read': {
            empty: {},
        },
    });

    const result = t.read('test-empty-read', enc);

    assert.ok(result instanceof Map);
    const emptyDir = result.get('empty');
    assert.ok(emptyDir instanceof Map);
    assert.equal(emptyDir.size, 0);
});

test('write handles deeply nested structures', () => {
    const tempDir = p.resolve('test-deep');
    const tree: t.FSTree = new Map([
        [
            'level1',
            new Map([['level2', new Map([['level3', new Map([['deep.txt', 'deep content']])]])]]),
        ],
    ]);

    t.write(tree, tempDir);

    assert.equal(
        fs.readFileSync(p.resolve(tempDir, 'level1', 'level2', 'level3', 'deep.txt'), enc),
        'deep content'
    );
});
