# majas

> _Markdown and JSON Are Similar._\
> All data is hierarchical if you look at it long enough.

**majas** is a format-agnostic structured data converter. It lets you translate between hierarchical formats like Markdown, JSON, and directory trees — not by trying to preserve syntax, but by capturing the **underlying shape**.

Whether you're trying to break up a massive Markdown doc, reverse-engineer a messy JSON export, or treat your filesystem like a structured document — **majas** gives you tools to traverse, transform, and rematerialize **hierarchical data**.

## Philosophy

- **Structure > Syntax**  
  Markdown, JSON, XML, folders — all express _trees_. majas extracts the hierarchy and leaves the quirks behind.

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

<code>majas [-i] [-4 *from*] [-2 *to*] [-o *output*] [-i*option*...] [-o*option*] [FILE]</code>

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
- All output is generated from that IR — so conversion is always **format → IR → format**.

## Notes

- Majas is **format-agnostic**, **language-agnostic**, and sometimes even **logic-agnostic**.
- It doesn't care what you're doing. But it _knows_ all data is a tree.
- Be careful: using `majas` means accepting the truth of its name.

## Changelog

### 1.1.0

- Moved @types/fs-extra from dependencies to devDependencies

### 1.0.0

Initial release

> Markdown and JSON are similar. Everything else is detail.
