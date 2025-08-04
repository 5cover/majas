import test from 'node:test';
import * as assert from 'node:assert/strict';
import Markdown from '../../src/formats/Markdown.js';
import IRNode, { OrdereableArray } from '../../src/core/IRNode.js';

// Nominal

test('Markdown parses basic document', () => {
    const input = `# H1

test`;

    const markdown = new Markdown();
    const doc = markdown.parse(input);

    assert.deepEqual(doc.root, {
        children: children({
            title: 'H1',
            content: 'test',
        }),
    } satisfies IRNode);
});

test('Markdown parses h2 document', () => {
    const input = `# H1

## H2

hope`;

    const markdown = new Markdown();
    const doc = markdown.parse(input);

    assert.deepEqual(doc.root, {
        children: children({
            title: 'H1',
            children: children({
                title: 'H2',
                content: 'hope',
            }),
        }),
    } satisfies IRNode);
});

test('Markdown parses h1 & h2 document', () => {
    const input = `# H1

test

## H2

hope`;

    const markdown = new Markdown();
    const doc = markdown.parse(input);

    assert.deepEqual(doc.root, {
        children: children({
            title: 'H1',
            content: 'test',
            children: children({
                title: 'H2',
                content: 'hope',
            }),
        }),
    } satisfies IRNode);
});

test('Markdown no title document', () => {
    const input = `just some random text`;

    const markdown = new Markdown();
    const doc = markdown.parse(input);

    assert.deepEqual(doc.root, {
        content: input,
    } satisfies IRNode);
});

test('Markdown empty document', () => {
    const input = ``;

    const markdown = new Markdown();
    const doc = markdown.parse(input);

    assert.deepEqual(doc.root, {} satisfies IRNode);
});

test('Markdown title after content', () => {
    const input = `test
    
# H1`;

    const markdown = new Markdown();
    const doc = markdown.parse(input);

    assert.deepEqual(doc.root, {
        content: 'test',
        children: children({
            title: 'H1',
        }),
    } satisfies IRNode);
});

test('Markdown brothers', () => {
    const input = `
# Mario

mario

# Luigi

luigi`;

    const markdown = new Markdown();
    const doc = markdown.parse(input);

    assert.deepEqual(doc.root, {
        children: children(
            {
                title: 'Mario',
                content: 'mario',
            },
            {
                title: 'Luigi',
                content: 'luigi',
            }
        ),
    } satisfies IRNode);
});

test('Markdown All 6', () => {
    const input = `
h0 content

# h1 heading

h1 content

## h2 heading

h2 content

### h3 heading

h3 content

#### h4 heading

h4 content

##### h5 heading

h5 content

###### h6 heading

h6 content`;

    const markdown = new Markdown();
    const doc = markdown.parse(input);

    assert.deepEqual(doc.root, {
        content: 'h0 content',
        children: children({
            title: 'h1 heading',
            content: 'h1 content',
            children: children({
                title: 'h2 heading',
                content: 'h2 content',
                children: children({
                    title: 'h3 heading',
                    content: 'h3 content',
                    children: children({
                        title: 'h4 heading',
                        content: 'h4 content',
                        children: children({
                            title: 'h5 heading',
                            content: 'h5 content',
                            children: children({
                                title: 'h6 heading',
                                content: 'h6 content',
                            }),
                        }),
                    }),
                }),
            }),
        }),
    } satisfies IRNode);
});

function children(...nodes: IRNode[]): OrdereableArray | undefined {
    return nodes.length
        ? {
              ordered: true,
              items: nodes instanceof Array ? nodes : [nodes],
          }
        : undefined;
}
