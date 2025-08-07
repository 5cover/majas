so i have made discovery

can you expand this draft into a full blog post/reference for me and others to remember this subte dilemma of programming, what it mean and the abstract problems it uncovers?

i wrote this in the context of developing majas

---

# IRNode Normalization

- IRNode: core data structure
- used everywhere, must be flexible, ergonomic, but still robust for formatter implementations and testing
- as such, flxebility in the type: optionals, undefined placeholder for empty OrderableArray
- except this breakes strict equality. now, two IRNode a and b might a !== b even though they have the same semantic content
- this means a test might break if we add a `title: undefined` in an IRNode creation for instance. Since a property being absent isn't equivalent to it having an undefined value, even though JavaScript pretends it is.
- leads to headaches with edge cases and weird, empty-like inputs (empty directory, empty markdown document, empty markdown heading...)
- two conflicting solutions. We need to normalize... but should we do it at the time of IRNode creation, keeping our types pure and rigid and with only one representation of any semantic value? or at the time of usage, with more flexible type but more ergonomic instanciation?
- my instinct: normalization at time of creation ("rigid typing", normalize first). why? keeps the type pure, avoids confusing javascript edge cases (like the absence of a property VS undefined value).. Except it makes code harder to write, since there are many places where IRNodes are created (formatter implementations, test input and expected data), each of which must now manage their own logic to make sure the rigid IRNode type is properly initialized. TypeScript will weep. You can make helper function like a `mkIR(node: Partial<IRNode>)` but this has a boilerplate and performance code
- the other solution: normalization at the time of usage ("loose typing", normalize last). less elegant, less pure, but turns out more practical
  - easier instanciation due to multiple value meaning the same thing
  - direct usage still kept simple enough ('in' checks are ill-advised, null-propagating member access operator to the rescue..) in 90% of cases
  - specific usage (like pretty-printing or comparison) requires explicit normalization transformation to reduce non-semantic differences to a canonical, minimal representation
- which one to choose: one question: what is there most of in your code? Creation of distinct IRNodes? Or usage?
- in my case i think i create them more than i use them, so it makes sense to use the "loose typing" approach, since that means fewer places in the code to change.
- it's true sometimes the same node can be reused in many ways but that doesn't require repeated normalization, just normalize once and store the result in a variable. This is the oppposite of IRNode creation in the rigit typing approach, where each site creates a new object and as such would need its own normalization call.
- normalization can return a special "rigid" version of the type... or not. in my case typescript can't represent a property that can be absent but not undefined nor enforce non-empty arrays so there are no relevant changes to make to the normalized IRNode interface
- allows to use assert.deepEqual again, though normalize must be called on actual and expected.. i'll probably make a helper.

## code extracts (to add context and examples -- you can reuse them)

Loose typing version:

```ts
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

export interface OrderableArray {
  /**
   * Indicates whether the order of `items` is semantically meaningful.
   *
   * - `true` for JSON arrays, XML elements, Markdown lists, etc.
   * - `false` for JSON objects, unordered sets, or filesystem folders.
   */
  ordered: boolean;
  items: IRNode[];
}
```

Rigid typing version (not implemented -- just a draft):

```ts
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
   */
  title: string | undefined;

  /**
   * Optional content of the node as a string.
   *
   * - Always stringified (even if the original data was a number, boolean, etc.).
   * - Empty string content is allowed.
   */
  content: string | undefined;

  /**
   * Ordered list of child nodes.
   */
  children: OrderableArray;
}

export interface OrderableArray {
  /**
   * Indicates whether the order of `items` is semantically meaningful. Irrelevant when items is empty.
   *
   * - `true` for JSON arrays, XML elements, Markdown lists, etc.
   * - `false` for JSON objects, unordered sets, or filesystem folders.
   */
  ordered: boolean;

  items: IRNode[];
}
```

Loose IRNode normalization function:

```ts
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
```

Sample usage in an assertion:

```ts
assert.deepEquals(
  normalize(formatter.parse('whatever')),
  normalize({
    title: 'section',
    content: 'hello',
    children: { ordered: true, items: [{ title: 'child', content: 'world' }] },
  })
);
```
