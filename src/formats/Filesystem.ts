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

export interface Options {
    baseDirname: string;
    baseFilename: string;
    invalidFilenameCharReplacement?: string | ((substring: string) => string);
    /**
     * Formats file header.
     * @param title Node title
     * @param index Node inbdex, 1-based.
     * @returns Formatted file header string, placed at the start of the file.
     */
    header?: (title: string | undefined, index: number | undefined) => string;
    /**
     * Formats base file or directory name.
     * @param title Node title
     * @param index Node inbdex, 1-based.
     * @returns Formatted file/directory name string, concatenanted to the appropriate extension for files.
     */
    filename: (title: string, index: number | undefined) => string;
}

export const DefaultOptions = {
    baseDirname: '.',
    baseFilename: 'out',
    filename: title => title,
} as const satisfies Options;

export default class Filesystem extends FormatterBase<FSTreeNode, FSTree> {
    private readonly options: Readonly<Options>;
    constructor(format: Format, options?: Partial<Readonly<Options>>) {
        super(format);
        this.options = { ...DefaultOptions, ...options };
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
        const walk = (parent: Map<string, FSTree>, node: IRNode, index?: number) => {
            const filename: string | undefined =
                map(
                    t =>
                        sanitize(this.options.filename(t, index), {
                            replacement: this.options.invalidFilenameCharReplacement,
                        }),
                    node.title
                ) ?? index?.toString();
            if (node.content !== undefined) {
                const contentFilename = uniqify(
                    `${filename ?? this.options.baseFilename}.${output.format.fileExtensions[0] ?? 'txt'}`,
                    s => parent.has(s)
                );
                parent.set(
                    contentFilename,
                    (this.options.header?.(node.title, index) ?? '') + node.content
                );
            }
            // allow empty directory when no content
            if (node.children?.items.length || node.content === undefined) {
                const childrenDirname = uniqify(filename ?? this.options.baseDirname, s =>
                    parent.has(s)
                );
                const children = new Map<string, FSTree>();
                parent.set(childrenDirname, children);
                node.children?.items.forEach((n, i) => walk(children, n, i + 1));
            }
        };

        walk(children, output.root);
        return children;
    }
}
