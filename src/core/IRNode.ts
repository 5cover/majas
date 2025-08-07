import type { Schema } from 'ajv';

/**
 * A node in the intermediate representation (IR) tree used by majas.
 *
 * This structure abstracts the hierarchy of formats like Markdown, JSON, XML, and filesystem trees.
 */
export default interface IRNode {
    /**
     * Optional label for the node.
     *
     * - Represents keys in JSON, tag names in XML, headings in Markdown, or filenames in a directory.
     * - Empty string title is allowed.
     *
     * absent <=> undefined
     */
    title?: string;

    /**
     * Optional content of the node as a string.
     *
     * - Always stringified (even if the original data was a number, boolean, etc.).
     * - Empty string content is allowed.

     * absent <=> undefined
     */
    content?: string;

    /**
     * Ordered list of child nodes.
     *
     * - May be undefined, meaning the node has no children.
     *
     * absent <=> undefined <=> { ordered: true, items: [] } <=> { ordered: false, items: [] }
     */
    children?: OrderableArray;
}

/**
 * Normalizes an IRNode to a consistent, minimal representation of the same semantics.
 * May mutate @p node and its children and returns it.
 */
export function normalize(node: IRNode) {
    if (node.title === undefined) delete node.title;
    if (node.content === undefined) delete node.content;
    if (node.children === undefined || node.children.items.length === 0) delete node.children;
    else node.children.items.forEach(normalize);
    return node;
}

export interface OrderableArray {
    /**
     * Indicates whether the order of `items` is semantically meaningful.
     *
     * - `true` for JSON arrays, XML elements, Markdown lists, etc.
     * - `false` for JSON objects, unordered sets, or filesystem folders.
     */
    ordered: boolean;
    items: readonly IRNode[];
}
export const IRNodeSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        title: {
            type: 'string',
        },
        content: {
            type: 'string',
        },
        children: {
            type: 'object',
            properties: {
                ordered: {
                    type: 'boolean',
                },
                items: {
                    type: 'array',
                    items: {
                        $ref: '#',
                    },
                },
            },
            required: ['ordered', 'items'],
        },
    },
} as const satisfies Schema;
