import sanitize from 'sanitize-filename';
import type Document from '../core/Document.js';
import type { Format } from '../core/Format.js';
import { FormatterBase } from '../core/Formatter.js';
import type IRNode from '../core/IRNode.js';
import { type FSTree } from '../fstree.js';
import { uniqify } from '../util/string.js';
import { map } from '../util/misc.js';

export interface FSTreeNode {
    title: string;
    children: FSTree;
}

export default class Filesystem extends FormatterBase<FSTreeNode, FSTree> {
    constructor(
        format: Format,
        private readonly baseDirname = '.',
        private readonly baseFilename = 'out'
    ) {
        super(format);
    }
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
        const walk = (parent: Map<string, FSTree>, node: IRNode, index: number) => {
            const filename: string | undefined =
                map(sanitize, node.title) ?? (isNaN(index) ? undefined : index.toString());
            if (node.content !== undefined) {
                const contentFilename = uniqify(
                    `${filename ?? this.baseFilename}.${output.format.fileExtensions[0] ?? 'txt'}`,
                    s => parent.has(s)
                );
                parent.set(contentFilename, node.content);
            }
            // allow empty directory when no content
            if (node.children?.items.length || node.content === undefined) {
                const childrenDirname = uniqify(filename ?? this.baseDirname, s => parent.has(s));
                const children = new Map<string, FSTree>();
                parent.set(childrenDirname, children);
                node.children?.items.forEach((n, i) => walk(children, n, i));
            }
        };

        walk(children, output.root, NaN);
        return children;
    }
}
