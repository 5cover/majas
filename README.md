# majas

> Markdown and JSON Are Similar.
> Because all data is hierarchical if you look at it long enough.

**majas** is a format-agnostic structure converter. It lets you translate between hierarchical formats like Markdown, JSON, and directory trees — not by trying to preserve syntax, but by capturing the **underlying shape**.

Whether you're trying to break up a massive Markdown doc, reverse-engineer a messy JSON export, or treat your filesystem like a structured document — **majas** gives you tools to traverse, transform, and rematerialize **hierarchical data**.

## ✨ Philosophy

- **Structure > Syntax**  
  Markdown, JSON, XML, folders — all express _trees_. majas extracts the hierarchy and leaves the quirks behind.

- **Not lossless, not perfect, not magic**  
  majas makes **opinionated conversions**, focused on exploration and manipulation, not round-trip fidelity.

- **One simple internal model**  
  All formats are parsed into a common **IR (intermediate representation)**: a minimal tree of nodes with optional titles, contents, and children.

- **CLI-first, API-ready**  
  The core logic is a clean TypeScript library. The CLI is just a friendly wrapper.

## 🧱 Stack

- **Language**: Node.js with TypeScript
- **Parser**: `unified` + `remark` for Markdown, custom logic for JSON and filesystem
- **API-first**: Reusable module for embedding or scripting
- **No build step**: Runs directly via `npx`, `tsx`, or local Node install

## 📦 Installation

```sh
npm install -g majas
# or just use via npx
npx majas ...
```

## 📐 IR Structure

```ts
type IRNode = {
    title?: string; // e.g., heading, key, file/folder name
    content?: string; // e.g., paragraph text, string value, file content
    children?: IRNode[]; // nested structure
};
```

Every format is parsed into this shape. Every export is rendered from it.

## 🚀 Usage

### Convert between formats

```sh
majas convert <input> --from <format> --to <format> [options]
```

#### Examples

```sh
# Convert a Markdown doc into a directory of smaller .md files
majas convert notes.md --from md --to fs

# Flatten a deeply nested JSON structure into Markdown
majas convert data.json --from json --to md

# Turn a folder of text files into a single Markdown document
majas convert ./docs --from fs --to md
```

### Options

| Flag      | Description                                |
| --------- | ------------------------------------------ |
| `--depth` | Max depth to traverse (default: full tree) |
| `--out`   | Output path or directory                   |
| `--from`  | Input format: `md`, `json`, `fs`           |
| `--to`    | Output format: `md`, `json`, `fs`          |

More options and format-specific configuration coming soon.

## 🔮 Roadmap

- More input/output formats: XML, YAML, HTML
- Configurable mappings (e.g., array ↔ heading list)
- Metadata support in IR (line numbers, paths, source type)
- GUI/Playground
- VSCode extension?

---

**majas** is in early development. Expect sharp edges, surprising conversions, and plenty of possibilities.

> Markdown and JSON are similar. Everything else is detail.
