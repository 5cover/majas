import { describe, it } from 'node:test';
import formats from '../../src/core/formats.js';
import type IRNode from '../../src/core/IRNode.js';
import type { OrderableArray } from '../../src/core/IRNode.js';
import Markdown, { HeadingDepths, type Options } from '../../src/formats/Markdown.js';
import { assertEqualsIR } from '../testing.js';

// Nominal

function markdown(options?: Options) {
    return new Markdown(formats[1], options);
}

describe('Markdown formatter', () => {
    it('parses basic document', () => {
        const input = `# H1

test`;

        const doc = markdown().parse(input);

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

        const doc = markdown().parse(input);

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

        const doc = markdown().parse(input);

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

        const doc = markdown().parse(input);

        assertEqualsIR(doc.root, {
            content: input,
        });
    });

    it('parses empty document', () => {
        const input = ``;

        const doc = markdown().parse(input);

        assertEqualsIR(doc.root, {});
    });

    it('parses anonymous h1', () => {
        const input = `# `;

        const doc = markdown().parse(input);

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

        const doc = markdown().parse(input);

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

        const doc = markdown().parse(input);

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

        const doc = markdown().parse(input);

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

        const doc = markdown().parse(input);

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

    it('parses nonlinear headings', () => {
        const input = `
# h1

###### h6

### h3

## h2

##### h5

# h1`;
        const doc = markdown().parse(input);

        assertEqualsIR(doc.root, {
            children: children(
                {
                    title: 'h1',
                    children: children(
                        {
                            title: 'h6',
                        },
                        {
                            title: 'h3',
                        },
                        {
                            title: 'h2',
                            children: children({
                                title: 'h5',
                            }),
                        }
                    ),
                },
                {
                    title: 'h1',
                }
            ),
        });
    });

    it('parses with a bounded depth', () => {
        const headings = ['# h1', '## h2', '### h3', '#### h4', '##### h5', '###### h6'];
        const input = headings.join('\n');

        for (const i of HeadingDepths) {
            const doc = markdown({ depth: i }).parse(input);
            assertEqualsIR(
                doc.root,
                {
                    children: children(node(i)),
                },
                true
            );
        }

        function node(max: Options['depth'], i = 1): IRNode {
            return {
                title: `h${i}`,
                content:
                    i < max || i === headings.length ? undefined : headings.slice(i).join('\n'),
                children: i < max ? children(node(max, i + 1)) : undefined,
            };
        }
    });

    it('parses realish document', () => {
        const content = {
            'Soutenance de stage Engie': undefined,
            "(construction de l'application)": 'A',

            Introduction: 'B',
            'Présentation Engie': 'C',
            Caractérisation: 'D',
            'Mon équipe': 'E',
            'Mon équipe_Caractérisation': 'F',
            'Sujet de stage': 'G',
        } as const;
        const input = `# Soutenance de stage Engie

## (construction de l'application)

${content["(construction de l'application)"]}

## Introduction

${content.Introduction}

## Présentation Engie

${content['Présentation Engie']}

### Caractérisation

${content.Caractérisation}

### Mon équipe

${content['Mon équipe']}

#### Mon équipe_Caractérisation

${content['Mon équipe_Caractérisation']}

## Sujet de stage

${content['Sujet de stage']}`;

        const doc = markdown().parse(input);

        assertEqualsIR(doc.root, {
            children: children(
                node(
                    'Soutenance de stage Engie',
                    node("(construction de l'application)"),
                    node('Introduction'),
                    node(
                        'Présentation Engie',
                        node('Caractérisation'),
                        node('Mon équipe', node('Mon équipe_Caractérisation'))
                    ),
                    node('Sujet de stage')
                )
            ),
        });
        function node(title: keyof typeof content, ...nodes: readonly IRNode[]): IRNode {
            return {
                title,
                content: content[title],
                children: children(...nodes),
            };
        }
    });
});

function children(...nodes: readonly IRNode[]): OrderableArray | undefined {
    return nodes.length
        ? {
              ordered: true,
              items: nodes instanceof Array ? nodes : [nodes],
          }
        : undefined;
}
