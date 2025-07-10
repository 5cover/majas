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
     * - May be empty (`""`) or undefined for anonymous content nodes.
     */
    title?: string;

    /**
     * Optional content of the node as a string.
     *
     * - Always stringified (even if the original data was a number, boolean, etc.).
     * - Nodes may have content, children, or both.
     */
    content?: string;

    /**
     * Ordered list of child nodes.
     *
     * - Never undefined. An empty array means the node has no children.
     * - The `$`-titled child is reserved (e.g., for representing XML attributes).
     */
    children: IRNode[];

    /**
     * Indicates whether the order of `children` is semantically meaningful.
     *
     * - `true` for JSON arrays, XML elements, Markdown lists, etc.
     * - `false` for JSON objects, unordered sets, or filesystem folders.
     */
    childrenOrdered: boolean;
}
