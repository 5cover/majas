# IRNode Normalization: The Subtle Dilemma of Flexible vs Rigid Types

When designing data structures in programming, a common challenge arises: balancing flexibility with robustness. Recently, while developing **majas**—a CLI tool for hierarchical document conversion—I encountered an intriguing case of this tension with a core data structure: the `IRNode`. This document explores the subtle but significant issue of **IRNode normalization** and the abstract problems it uncovers.

## The IRNode: A Quick Primer

In majas, an `IRNode` represents nodes in an intermediate representation (IR), designed to abstract hierarchical formats like Markdown, JSON, XML, or filesystem structures.

Here's the simplified structure of an IRNode:

```typescript
interface IRNode {
  title?: string; // Optional, absent <=> undefined
  content?: string; // Optional, absent <=> undefined
  children?: OrderableArray; // Optional, absent <=> empty children
}

interface OrderableArray {
  ordered: boolean; // True if child order is semantically meaningful
  items: IRNode[];
}
```

## The Core Problem: Flexibility vs. Equality

The design choice above makes IRNode flexible and easy to instantiate:

- Properties (`title`, `content`, `children`) can be absent or explicitly set to `undefined`.
- An absent property is often treated equivalently to an explicitly undefined property by JavaScript.

But subtlety arises:

- Two nodes (`a` and `b`) with identical semantic meaning might fail strict equality checks (`a !== b`) because one explicitly includes `title: undefined`, and the other omits the title entirely.

```typescript
const nodeA = { content: 'hello' };
const nodeB = { content: 'hello', title: undefined };
console.log(nodeA === nodeB); // false
```

This subtlety leaks into testing and formatting logic, causing headaches:

- Tests unexpectedly break if implementation details subtly change (e.g., adding `title: undefined`).
- Edge cases emerge, especially with empty inputs (empty directories, empty markdown, etc.).

## Normalization as a Solution

The logical solution is **normalization**—transforming nodes into a consistent, canonical form. But where should normalization occur?

Two approaches emerge:

### 1. Rigid Typing: Normalize at Creation

Enforce a strictly normalized IRNode type immediately upon creation:

- `title` and `content` explicitly `string | undefined`.
- `children` always initialized, even if empty.

This ensures purity and semantic clarity:

```typescript
interface IRNodeRigid {
  title: string | undefined;
  content: string | undefined;
  children: OrderableArray; // Always initialized
}
```

**Pros:**

- Clear semantics, no ambiguity.
- Avoids JavaScript's confusing absence vs. undefined edge-cases.

**Cons:**

- Boilerplate-heavy. Every IRNode creation site must explicitly handle empty values.
- Less ergonomic, more verbose initialization code.
- TypeScript pain: strict initialization means helper functions (`mkIR()`) needed everywhere.

### 2. Loose Typing: Normalize at Usage

Allow flexible IRNode creation with absent properties or undefined placeholders, deferring normalization to usage-time:

```typescript
interface IRNodeLoose {
  title?: string;
  content?: string;
  children?: OrderableArray;
}

// Normalization helper
function normalize(node: IRNodeLoose): IRNodeLoose {
  if (node.title === undefined) delete node.title;
  if (node.content === undefined) delete node.content;
  if (!node.children || node.children.items.length === 0) delete node.children;
  else node.children.items.forEach(normalize);
  return node;
}
```

**Pros:**

- Simpler, ergonomic IRNode creation.
- Less boilerplate, more readable tests.
- Specific cases (assertions, pretty-printing) explicitly normalize as needed.

**Cons:**

- Slightly less elegant and pure.
- Normalization might be repeatedly called on identical nodes if not careful.

## Choosing Between the Two Approaches

The decision hinges on a key question:

**"Which operation is more frequent—creation or usage?"**

If IRNode instances are created more frequently than used distinctly:

- **Loose Typing** (normalize later) makes sense. It's practical, ergonomic, and simpler.

If the same IRNode instance is used multiple times in sensitive contexts:

- **Rigid Typing** (normalize first) might be better, providing semantic guarantees immediately.

In majas, IRNodes are frequently created, especially in formatter implementations and tests. Thus, adopting the **loose typing** approach is more pragmatic:

- Normalization happens explicitly, only when required.
- Reduces boilerplate significantly.
- Keeps the TypeScript compiler and developer happier.

## Practical Usage & Examples

Here's how normalization can be cleanly used in practice:

```typescript
assert.deepEqual(
  normalize(formatter.parse('input data')),
  normalize({
    title: 'example',
    content: 'normalized!',
    children: { ordered: true, items: [{ content: 'child' }] },
  })
);
```

## Conclusions & Broader Reflections

The IRNode normalization problem illustrates a broader dilemma in programming:

- **Rigid Types** provide purity and semantic safety at the cost of ergonomics and boilerplate.
- **Flexible Types** optimize ergonomics, sacrificing immediate semantic clarity.

Real-world software design often requires balancing these opposing forces. In practice:

- Identify which side (creation or usage) dominates in your system.
- Normalize at the side with fewer occurrences to minimize overhead.
- Always ensure normalization logic is centralized, consistent, and easily testable.

The normalization question in majas reflects a timeless software engineering insight:

> There's rarely a "perfect" answer—just a "better" answer for your specific context.

In majas's context, loose typing (normalizing at usage) emerged as the more elegant, practical solution, embodying the artful compromise that often characterizes thoughtful programming.
