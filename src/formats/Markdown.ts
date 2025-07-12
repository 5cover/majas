import type * as md from 'mdast';
import type IRNode from '../core/IRNode.js';
import Format from '../core/Format.js';
import type Document from '../core/Document.js';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { throwf } from '../util/misc.js';

export default class Markdown extends Format {
    override readonly name = 'Markdown';
    override readonly fileExtensions = [
        'md',
        'markdown',
        'mdown',
        'mkdn',
        'mkd',
        'mdwn',
        'mkdown',
        'ron',
    ] as const;
    private input!: string;
    private root!: md.Root;
    protected override parseImpl(input: string): Document {
        this.input = input;
        this.root = fromMarkdown(input);
        const root = this.md2ir(this.root);
        return { format: this, root };
    }
    override emit(input: Document): string {
        return '';
    }

    private md2ir(parent: md.Parent): IRNode {
        const nodes: IRNode[] = [];
        let stack = [nodes];
        let previousHeadingLevel: md.Heading['depth'] | 0 = 0;
        for (const md of parent.children) {
            if (isHeading(md)) {
                if (previousHeadingLevel < md.depth) {
                    // Child
                    const newScope: IRNode[] = [];
                    stack[0].push({
                        // Get raw child source
                        title: this.getSource(md.children),
                        children: newScope,
                        childrenOrdered: true,
                    });
                    stack.push(newScope);
                } else if (previousHeadingLevel > md.depth) {
                    // Parent
                    stack.pop();
                } else {
                    // Brother
                }
            }
        }

        return nodes.length === 1
            ? nodes[0]
            : {
                  children: nodes,
                  childrenOrdered: true,
              };
    }

    private getSource(nodes: readonly md.Node[]) {
        const l = nodes.length;
        return l
            ? this.input.substring(
                  nodes[0].position?.start.offset ?? throwf(new Error('missing node start offset')),
                  nodes[l - 1].position?.end.offset ?? throwf(new Error('missing node end offset'))
              )
            : undefined;
    }
}

function isHeading(node: md.Node): node is md.Heading {
    return node.type === 'heading';
}
