import type Document from '../core/Document.js';
import { FormatterBase } from '../core/Formatter.js';
import type IRNode from '../core/IRNode.js';
import { type FSTree } from '../fstree.js';
import { uniqify } from '../util/string.js';

export interface FSTreeNode {
    title: string;
    children: FSTree;
}

export default class Filesystem extends FormatterBase<FSTreeNode, FSTree> {
    protected override parseImpl(input: FSTreeNode): IRNode {
        if (typeof input.children === 'string') {
            return {
                title: input.title,
                content: input.children,
            };
        }

        return {
            title: input.title,
            children: {
                ordered: false,
                items: Array.from(input.children, ([name, child]) =>
                    this.parseImpl({ title: name, children: child })
                ),
            },
        };
    }

    override emit(output: Document): FSTree {
        const children = new Map<string, FSTree>();
        walk(children, output.root, NaN);
        return children;

        function walk(parent: Map<string, FSTree>, node: IRNode, index: number) {
            const filename = node.title ?? (isNaN(index) ? 'out' : index.toString());
            if (node.content !== undefined) {
                const contentFilename = uniqify(
                    `${filename}.${output.format.fileExtensions[0] ?? 'txt'}`,
                    s => parent.has(s)
                );
                parent.set(contentFilename, node.content);
            }
            // allow empty directory when no content
            if (node.children?.items.length || node.content === undefined) {
                const childrenDirname = uniqify(filename, s => parent.has(s));
                const children = new Map<string, FSTree>();
                parent.set(childrenDirname, children);
                node.children?.items.forEach((n, i) => walk(children, n, i));
            }
        }
    }
}
