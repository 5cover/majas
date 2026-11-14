# Project Architecture

Majas converts hierarchical formats through an intermediate representation (IR). `src/core/IRNode.ts` defines nodes with optional title, content, and ordered or unordered children; `Document` also records the source format. Empty child arrays and absent children are semantically equivalent. IR normalization can mutate its input.

`src/core/formats.ts` registers IR JSON, Markdown, and filesystem formats, validates their CLI options with AJV, and adapts the formatters to path/stdin and output I/O. `src/core/Formatter.ts` defines the formatter contract and wraps parse failures. `src/cli.ts` selects the formats and runs parse -> IR -> emit. `src/index.ts` exposes in-memory parse and emit functions and types; it does not perform filesystem I/O.

`src/formats/Markdown.ts` parses top-level headings with mdast and preserves content as source text. Its emitter renders the IR and rebases filesystem file headings. Markdown cannot represent unnamed non-root nodes or more than six heading levels without the opt-in HTML fallback. `src/formats/Filesystem.ts` maps IR nodes to in-memory file trees; `src/fstree.ts` reads and writes those trees. `src/formats/IR.ts` reads and writes the JSON representation. Filesystem nodes are unordered, whereas Markdown nodes are ordered.

Run `pnpm test`, `pnpm run build`, `pnpm exec tsc --noEmit`, and `pnpm run lint` for verification. Tests use Node's test runner through tsx; formatter tests are under `test/formats`, and conversion API tests are in `test/conversion.test.ts`. The pre-commit hook runs the test suite. The package uses pnpm and Node ESM.
