import type * as md from 'mdast';
import type IRNode from '../core/IRNode.js';
import type Document from '../core/Document.js';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { normalizePartial, throwf } from '../util/misc.js';
import { FormatterBase } from '../core/Formatter.js';
import type { Format } from '../core/Format.js';

export const HeadingDepths = [1, 2, 3, 4, 5, 6] as const satisfies md.Heading['depth'][];

export interface Options {
    depth: md.Heading['depth'];
}

export const DefaultOptions = {
    depth: 6,
} as const satisfies Options;

export default class Markdown extends FormatterBase<string> {
    private readonly options: Readonly<Options>;
    constructor(format: Format, options?: Partial<Readonly<Options>>) {
        super(format);
        this.options = normalizePartial<Options>(DefaultOptions, options);
    }
    private input!: string;
    protected override parseImpl(input: string): IRNode {
        this.input = input;
        const root = fromMarkdown(input);
        return this.md2ir(root);
    }
    override emit(_output: Document): string {
        return 'todo';
    }

    private md2ir(parent: md.Parent): IRNode {
        // initialized to a H0 (node englobing the whole document)
        const h0children: IRNode[] = [];
        const h0: IRNode = {
            children: { ordered: true, items: h0children },
        };
        const stack: (readonly [md.Heading['depth'] | 0, IRNode[]])[] = [[0, h0children]];
        let lastHeading = h0;
        let previousHeadingEndOffset = 0;
        for (const n of parent.children) {
            if (!isHeading(n) || n.depth > this.options.depth) continue;
            const content = this.input
                .substring(
                    previousHeadingEndOffset,
                    n.position?.start.offset ?? throwf(new Error('missing node start offset'))
                )
                .trim();
            if (content) lastHeading.content = content;
            while (stack[stack.length - 1][0] >= n.depth) {
                stack.pop();
            }
            const newScope: IRNode[] = [];
            stack[stack.length - 1][1].push(
                (lastHeading = {
                    // Get raw child source
                    title: this.getSource(n.children),
                    children: { ordered: true, items: newScope },
                })
            );
            stack.push([n.depth, newScope]);
            previousHeadingEndOffset =
                n.position?.end.offset ?? throwf(new Error('missing node end offset'));
        }

        const trailingContent = this.input.substring(previousHeadingEndOffset).trim();

        if (trailingContent) {
            lastHeading!.content = (lastHeading!.content ?? '') + trailingContent;
        }
        return h0;
    }

    private getSource(nodes: readonly md.Node[]): string {
        const l = nodes.length;
        return l
            ? this.input.substring(
                  nodes[0].position?.start.offset ?? throwf(new Error('missing node start offset')),
                  nodes[l - 1].position?.end.offset ?? throwf(new Error('missing node end offset'))
              )
            : '';
    }
}

function isHeading(node: md.Node): node is md.Heading {
    return node.type === 'heading';
}
