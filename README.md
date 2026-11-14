# majas

> _Markdown and JSON Are Similar._\
> All data is hierarchical if you look at it long enough.

**majas** is a format-agnostic structured data converter. It lets you translate between hierarchical formats like Markdown, JSON, and directory trees: not by trying to preserve syntax, but by capturing the **underlying shape**.

Whether you're trying to break up a massive Markdown doc, reverse-engineer a messy JSON export, or treat your filesystem like a structured document: **majas** gives you tools to traverse, transform, and rematerialize **hierarchical data**.

## Philosophy

- **Structure > Syntax**  
  Markdown, JSON, XML, folders: all express _trees_. majas extracts the hierarchy and leaves the quirks behind.

- **Not lossless, not perfect, not magic**  
  majas makes **opinionated conversions**, focused on exploration and manipulation, not round-trip fidelity.

- **One simple internal model**  
  All formats are parsed into a common **IR (intermediate representation)**: a minimal tree of nodes with optional titles, contents, and children.

- **CLI-first, API-ready**  
  The core logic is a clean TypeScript library. The CLI is just a friendly wrapper.

## Installation

```sh
npm install -g majas
# or just use via npx
npx majas ...
```

## Usage

<code>majas [-i] [-4 _from_] [-2 _to_] [-o _output_] [-i_option_...] [-o_option_] [FILE]</code>

If no input file is provided, data is read from **stdin**.

Output is always written to **stdout** unless `--out` is specified.

## Options

| Flag              | Alias | Description                                                                                                             |
| ----------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| `--from <format>` | `-4`  | Source format. **Optional** if file extension is unambiguous.                                                           |
| `--to <format>`   | `-2`  | Target format. If absent, Majas simply outputs the resolved input format and no conversion is performed.                |
| `--in-* <value>`  | `-i*` | Format-specific input options (e.g. `--in-indent 4`, `--in-encoding ascii`)                                             |
| `--out-* <value>` | `-o*` | Format-specific output options                                                                                          |
| `--out <file>`    | `-o`  | Output file (defaults to stdout)                                                                                        |
| `--help [FORMAT]` | `-h`  | Print usage help (including list of supported formats). If format is specified: explain format, print available options |
| `--infer`         | `-i`  | Infer input format from file extension; treat `--from` as a fallback on ambiguous input                                 |
| `--version`       | `-V`  | Show program version.                                                                                                   |
| `--help`          |       | Show help.                                                                                                              |

## Examples

### Convert a Markdown doc into a directory of smaller .md files

```sh
majas notes.md --from md --to fs
```

### Flatten a deeply nested JSON structure into Markdown

```sh
majas data.json --from json --to md
```

### Turn a folder of text files into a single Markdown document

```sh
majas ./docs --from fs --to md
```

### Convert from file (format inferred)

```sh
majas -2 json mydoc.md > output.json
```

### Convert from stdin (must specify `--from`)

```sh
majas -4 xml -2 markdown < input.xml
```

### With format-specific options

```sh
majas -4 json -2 markdown --out-table-style compact input.json
```

### Retrieve the inferred format of a file

```sh
$ majas --infer input.xml
XML
```

## How it works

- `-4` means you're using majas "**for**" a format.
- `-2` means you're converting "**to**" a format.
- If `--from` is not provided, `majas` will try to **infer the input format** from the file extension. Ambiguity is an error.
- If you pass `stdin`, `--from` is **required**.
- All input is parsed into a generic **intermediate representation (IR)**.
- All output is generated from that IR: so conversion is always **format &rarr; IR &rarr; format**.

## Notes

- Currently implemented formats are IR JSON (`ir`), Markdown (`md`), and filesystem trees (`fs`). The JSON and XML examples above describe intended future formats; `ir` accepts the IR node JSON structure.
- Markdown output rejects untitled non-root nodes and headings deeper than level six. Use `--out-html` to render deeper headings as accessible HTML; use `--in-html` to parse the exact generated HTML heading form back into the hierarchy. HTML heading parsing is disabled by default and is also disabled when `--in-depth` is less than six.
- Filesystem-to-Markdown conversion rebases headings in file contents under the file's generated heading. A leading H1 must match the filename without a recognized Markdown extension by default. Use `--out-title filename` or `--out-title heading` to select either title instead; a missing H1 always falls back to the filename.
- Use `--out-relative` for Markdown-to-filesystem output to give titled files an H1 and rebase their contained headings. This cannot be combined with `--out-header`. Use `--out-newline` to ensure output files end in a newline.
- Majas is **format-agnostic**, **language-agnostic**, and sometimes even **logic-agnostic**.
- It doesn't care what you're doing. But it _knows_ all data is a tree.
- Be careful: using `majas` means accepting the truth of its name.

## Programmatic API

The in-memory API separates conversion from I/O. Filesystem trees are strings for files and `Map<string, FSTree>` for directories.

```ts
import { emitFilesystem, emitMarkdown, parseFilesystem, parseMarkdown } from 'majas'

const document = parseMarkdown('# Notes\n\nHello')
const files = emitFilesystem(document, { relativeHeadings: true, trailingNewline: true })
const fromFiles = parseFilesystem({ title: 'docs', children: files })
const markdown = emitMarkdown(fromFiles, { title: 'filename' })
```

`parseIR` and `emitIR` handle the JSON IR format. `emitMarkdown` accepts `html` and `title` options; `parseMarkdown` accepts `depth` and `html`. All functions operate on values, without reading or writing files.

## Changelog

### 1.2.0

- Implemented Markdown output, including heading rebasing for filesystem content and configurable filename and heading title policies.
- Added opt-in accessible HTML headings beyond level six and parsing of the generated HTML heading form.
- Added filesystem output options for relative Markdown headings and trailing newlines.
- Added an in-memory conversion API with TypeScript declarations for Markdown, IR JSON, and filesystem trees.
- Fixed filesystem path input handling and declared missing ESLint configuration dependencies.

### 1.1.4

- Fixed @commander-js/extra-typings incorrectly being a devDependency

### 1.1.1

- `--infer` is now implicit when `--from` is not present
- Fixed errors related to the handling of missing config values

### 1.1.0

- Moved @types/fs-extra from dependencies to devDependencies

### 1.0.0

Initial release

> Markdown and JSON are similar. Everything else is detail.
