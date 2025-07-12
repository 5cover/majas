import test from 'node:test';
import * as assert from 'node:assert/strict';
import Markdown from '../../src/formats/Markdown.js';

// Nominal

test('Markdown parses basic document', () => {
    const input = `# H1

test`;

    const markdown = new Markdown();
    const doc = markdown.parse(input);

    assert.deepEqual(doc.root, {
        title: 'H1',
        childrenOrdered: true,
        children: ['test'],
    });
});
