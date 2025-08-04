import type * as md from 'mdast';
import type IRNode from '../core/IRNode.js';
import type Document from '../core/Document.js';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { throwf } from '../util/misc.js';
import { mkIR } from '../core/IRNode.js';
import { FormatterBase } from '../core/Formatter.js';

export default class Markdown extends FormatterBase<string> {
    private input!: string;
    protected override parseImpl(input: string): IRNode {
        this.input = input;
        const root = fromMarkdown(input);
        return this.md2ir(root);
    }
    override emit(output: Document): string {
        return 'todo';
    }

    private md2ir(parent: md.Parent): IRNode {
        // initialized to a H0 (node englobing the whole document)
        const h0children: IRNode[] = [];
        const h0: IRNode = {
            children: { ordered: true, items: h0children },
        };
        const stack = [h0children];
        let lastHeading = h0;
        let previousHeadingEndOffset = 0;
        let previousHeadingLevel: md.Heading['depth'] | 0 = 0;
        for (const md of parent.children) {
            if (!isHeading(md)) continue;
            const content = this.input
                .substring(
                    previousHeadingEndOffset,
                    md.position?.start.offset ?? throwf(new Error('missing node start offset'))
                )
                .trim();
            if (content) lastHeading.content = content;

            stack[stack.length - 1].at(-1)!;
            if (previousHeadingLevel >= md.depth) {
                // Parent
                stack.pop();
            }
            const newScope: IRNode[] = [];
            stack[stack.length - 1].push(
                (lastHeading = {
                    // Get raw child source
                    title: this.getSource(md.children),
                    children: { ordered: true, items: newScope },
                })
            );
            if (previousHeadingLevel <= md.depth) {
                // Child
                stack.push(newScope);
            }
            previousHeadingLevel = md.depth;
            previousHeadingEndOffset =
                md.position?.end.offset ?? throwf(new Error('missing node end offset'));
        }

        const trailingContent = this.input.substring(previousHeadingEndOffset).trim();

        if (trailingContent) {
            lastHeading!.content = (lastHeading!.content ?? '') + trailingContent;
        }
        return mkIR(h0);
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
