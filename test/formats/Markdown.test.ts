import { describe, it } from 'node:test';
import Markdown from '../../src/formats/Markdown.js';
import formats from '../../src/core/formats.js';
import type IRNode from '../../src/core/IRNode.js';
import type { OrderableArray } from '../../src/core/IRNode.js';
import { assertEqualsIR } from '../testing.js';

// Nominal

const markdownFormat = formats[1];
const markdown = new Markdown(markdownFormat);

describe('Markdown formatter', () => {
    it('parses basic document', () => {
        const input = `# H1

test`;

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {
            children: children({
                title: 'H1',
                content: 'test',
            }),
        });
    });

    it('parses h2 document', () => {
        const input = `# H1

## H2

hope`;

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {
            children: children({
                title: 'H1',
                children: children({
                    title: 'H2',
                    content: 'hope',
                }),
            }),
        });
    });

    it('parses h1 & h2 document', () => {
        const input = `# H1

test

## H2

hope`;

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {
            children: children({
                title: 'H1',
                content: 'test',
                children: children({
                    title: 'H2',
                    content: 'hope',
                }),
            }),
        });
    });

    it('parses no title document', () => {
        const input = `just some random text`;

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {
            content: input,
        });
    });

    it('parses empty document', () => {
        const input = ``;

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {});
    });

    it('parses anonymous h1', () => {
        const input = `# `;

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {
            children: children({
                title: '',
            }),
        });
    });

    it('parses empty headings', () => {
        const input = `# stuff
## A
## B
## C`;

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {
            children: children({
                title: 'stuff',
                children: children(
                    {
                        title: 'A',
                    },
                    {
                        title: 'B',
                    },
                    {
                        title: 'C',
                    }
                ),
            }),
        });
    });

    it('parses h1 after content', () => {
        const input = `test
    
# H1`;

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {
            content: 'test',
            children: children({
                title: 'H1',
            }),
        });
    });

    it('parses h1 brothers', () => {
        const input = `
# Mario

mario

# Luigi

luigi`;

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {
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
        });
    });

    it('parses h0-6', () => {
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

        const doc = markdown.parse(input);

        assertEqualsIR(doc.root, {
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
        });
    });
});

function children(...nodes: IRNode[]): OrderableArray | undefined {
    return nodes.length
        ? {
              ordered: true,
              items: nodes instanceof Array ? nodes : [nodes],
          }
        : undefined;
}
