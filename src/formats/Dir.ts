/* import type Document from '../core/Document.js';
import Format from '../core/Format.js';
import type IRNode from '../core/IRNode.js';
import { mkNode } from '../core/IRNode.js';
import FSTree from '../fstree.js';
import { uniqify } from '../util/string.js';

export default class Dir extends Format<FSTree> {
    override readonly name = 'dir';

    protected override parseImpl(input: FSTree): Document {
        const root = walk(input);
        return { root, format: this };

        function walk(node: FSTree): IRNode {
            if (typeof node.contents === 'string') {
                return mkNode({
                    title: undefined, // or infer from context?
                    content: node.contents,
                });
            }

            const children = Object.entries(node.contents).map(([name, child]) => {
                const childNode = walk(child);
                childNode.title = name; // set filename as title
                return childNode;
            });

            return mkNode({
                title: undefined, // directory itself may have no title or could infer
                children,
            });
        }
    }
    override emit(input: Document): FSTree {
        const roots = new Map<string, FSTree>();
        walk(roots, NaN, input.root);

        function walk(parent: Map<string, FSTree>, index: number, node: IRNode) {
            if (node.children.length) {
                const childrenDirname = uniqify(node.title ?? index.toString(), parent.has);
                const children = new Map<string, FSTree>();
                parent.set(childrenDirname, new FSTree(children));
                for (let i = 0; i < node.children.length; ++i) {
                    walk(children, i, node.children[i]);
                }
            }

            if (node.content !== undefined) {
                const contentFilename = uniqify(
                    node.title + (input.format.fileExtension ?? input.format.name),
                    parent.has
                );
                parent.set(contentFilename, new FSTree(node.content));
            }
        }
    }
}
 */
