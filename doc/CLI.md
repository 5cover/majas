# 🛠️ `majas` CLI

The `majas` CLI lets you convert between hierarchical document formats with a single command.

> Because **Markdown and JSON Are Similar.**  
> And all data is hierarchical if you look at it long enough.

## 🚀 Usage

```sh
majas [options] [input-file]
```

If no input file is provided, data is read from **stdin**.

Output is always written to **stdout** unless `--out` is specified.

## 🎛️ Options

| Flag              | Alias | Description                                                                             |
| ----------------- | ----- | --------------------------------------------------------------------------------------- |
| `--from <format>` | `-4`  | Source format. **Optional** if file extension is clear.                                 |
| `--to <format>`   | `-2`  | Target format. **Required.**                                                            |
| `--in-* <value>`  | `-i*` | Format-specific input options (e.g. `--in-indent 4`, `--in-encoding ascii`)             |
| `--out-* <value>` | `-o*` | Format-specific output options                                                          |
| `--out <file>`    | `-o`  | Output file (defaults to stdout)                                                        |
| `--help [FORMAT]` | `-h`  | Show usage help or if format is specified: describe it, print available options         |
| `--infer`         |       | Infer input format from file extension; treat `--from` as a fallback on ambiguous input |
| `--formats`       |       | List available formats                                                                  |

## 📦 Examples

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

## 🧠 How it works

- `-4` means you're using majas "**for**" a format. (Get it? 😉)
- `-2` means you're converting "**to**" a format.
- If `--from` is not provided, `majas` will try to **infer the input format** from the file extension. Ambiguity is an error.
- If you pass `stdin`, `--from` is **required**.
- All input is parsed into a generic **intermediate representation (IR)**.
- All output is generated from that IR — so conversion is always **format → IR → format**.

## 🧼 Notes

- Majas is **format-agnostic**, **language-agnostic**, and sometimes even **logic-agnostic**.
- It doesn't care what you're doing. But it _knows_ all data is a tree.
- Be careful: using `majas` means accepting the truth of its name.
