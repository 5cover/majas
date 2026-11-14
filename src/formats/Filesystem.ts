import sanitize from 'sanitize-filename'
import path from 'path'
import type Document from '../core/Document.js'
import type { Format } from '../core/Format.js'
import { FormatterBase } from '../core/Formatter.js'
import type IRNode from '../core/IRNode.js'
import type { FSTree } from '../fstree.js'
import { normalizePartial } from '../util/misc.js'

export interface FSTreeNode {
  title: string
  children: FSTree
}

export interface Options {
  baseDirname: string
  baseFilename: string
  contentFilename?: string
  order: 'check' | 'nums' | 'ignore'
  relativeHeadings: boolean
  trailingNewline: boolean
  invalidFilenameCharReplacement?: string | ((substring: string) => string)
  header?: (title: string | undefined, index: number | undefined) => string
  filename: (title: string, index: number | undefined) => string
}

export const DefaultOptions = {
  baseDirname: '.',
  baseFilename: 'content',
  order: 'check',
  relativeHeadings: false,
  trailingNewline: false,
  filename: title => title,
} as const satisfies Options

function compare(a: string, b: string): number {
  const left = Array.from(a, c => c.codePointAt(0)!)
  const right = Array.from(b, c => c.codePointAt(0)!)
  for (let i = 0; i < Math.min(left.length, right.length); i++) if (left[i] !== right[i]) return left[i] - right[i]
  return left.length - right.length
}

export default class Filesystem extends FormatterBase<FSTreeNode, FSTree> {
  private readonly options: Readonly<Options>
  private readonly allowRenaming: boolean
  constructor(format: Format, options?: Readonly<Partial<Options>>) {
    super(format)
    this.options = normalizePartial(DefaultOptions, options)
    this.allowRenaming = options?.filename !== undefined || options?.invalidFilenameCharReplacement !== undefined
    if (this.options.relativeHeadings && this.options.header)
      throw new Error('relative headings cannot be combined with a custom header')
    if (
      !this.options.baseFilename ||
      this.options.baseFilename === '.' ||
      this.options.baseFilename === '..' ||
      path.basename(this.options.baseFilename) !== this.options.baseFilename ||
      this.options.baseFilename.includes('\\')
    )
      throw new Error('content basename must be a single nonempty name')
    if (
      this.options.contentFilename !== undefined &&
      (path.basename(this.options.contentFilename) !== this.options.contentFilename ||
        !this.options.contentFilename ||
        this.options.contentFilename === '.' ||
        this.options.contentFilename === '..' ||
        this.options.contentFilename.includes('\\'))
    )
      throw new Error('content filename must be a single nonempty filename')
  }

  protected override parseImpl(input: FSTreeNode): IRNode {
    const stripHeader = (content: string, title?: string, index?: number): string => {
      const header = this.options.header?.(title, index) ?? ''
      if (!content.startsWith(header)) throw new Error(`Missing configured header for ${title ?? 'root'}`)
      return content.slice(header.length)
    }
    const walk = (tree: FSTree, title?: string, index?: number): IRNode => {
      if (typeof tree === 'string') return { title, content: stripHeader(tree, title, index) }
      const candidates = Array.from(tree.entries()).filter(
        ([name, value]) =>
          typeof value === 'string' &&
          (this.options.contentFilename !== undefined
            ? name === this.options.contentFilename
            : path.parse(name).name === this.options.baseFilename)
      )
      if (candidates.length > 1)
        throw new Error(`Ambiguous content files: ${candidates.map(([name]) => name).join(', ')}`)
      const content = candidates[0]
      const entries = Array.from(tree.entries())
        .filter(([name]) => name !== content?.[0])
        .sort(([a], [b]) => compare(a, b))
      const numbers = new Set<string>()
      let width: number | undefined
      const items = entries.map(([name, value], i) => {
        let bare = name
        if (this.options.order === 'nums') {
          const match = /^(\d+) (.+)$/.exec(name)
          if (!match) throw new Error(`Missing number prefix: ${name}`)
          width ??= match[1].length
          if (width !== match[1].length || numbers.has(match[1]))
            throw new Error(`Inconsistent or duplicate number prefix: ${name}`)
          numbers.add(match[1])
          bare = match[2]
        }
        const childTitle = typeof value === 'string' ? path.parse(bare).name : bare
        return walk(value, childTitle, i + 1)
      })
      return {
        title,
        content: content ? stripHeader(content[1] as string, title, index) : undefined,
        children: { ordered: this.options.order !== 'ignore', items },
      }
    }
    return walk(input.children)
  }

  override emit(output: Document): FSTree {
    const extension = output.format.fileExtensions[0] ?? 'txt'
    const contentName = this.options.contentFilename ?? `${this.options.baseFilename}.${extension}`
    const formatContent = (node: IRNode, index?: number): string => {
      const content = output.format.serializeSection?.(node, this.options.relativeHeadings) ?? node.content ?? ''
      let result = (this.options.header?.(node.title, index) ?? '') + content
      if (this.options.trailingNewline && !result.endsWith('\n')) result += '\n'
      return result
    }
    const entries = (node: IRNode, index?: number, root = false, location = '.'): Map<string, FSTree> => {
      const result = new Map<string, FSTree>()
      if (node.content !== undefined || (!root && node.headingSource !== undefined))
        result.set(contentName, formatContent(node, index))
      const children = node.children?.items ?? []
      const width = String(children.length).length
      const used = new Set<string>()
      const names = children.map((child, i) => {
        const title = child.title ?? String(i + 1)
        const formatted = this.options.filename(title, i + 1)
        const safe = sanitize(formatted, { replacement: this.options.invalidFilenameCharReplacement })
        if (!safe || safe === '.' || safe === '..' || (!this.allowRenaming && safe !== title))
          throw new Error(`Unsafe filesystem title: ${title}`)
        const number = this.options.order === 'nums' ? `${String(i + 1).padStart(width, '0')} ` : ''
        const name = number + safe + (child.children?.items.length ? '' : `.${extension}`)
        const logical = number + safe
        if (
          used.has(logical) ||
          result.has(name) ||
          name === contentName ||
          (this.options.contentFilename === undefined &&
            path.parse(name).name === this.options.baseFilename &&
            !child.children?.items.length)
        )
          throw new Error(`Filesystem name collision: ${name}`)
        used.add(logical)
        return name
      })
      if (this.options.order === 'check' && node.children?.ordered) {
        const conflicts: string[] = []
        for (let i = 1; i < names.length; i++) {
          if (compare(names[i - 1], names[i]) >= 0) {
            conflicts.push(
              `${JSON.stringify(children[i - 1].title ?? String(i))} (${JSON.stringify(names[i - 1])}) before ${JSON.stringify(children[i].title ?? String(i + 1))} (${JSON.stringify(names[i])})`
            )
          }
        }
        if (conflicts.length)
          throw new Error(
            `Section order differs from filesystem order in ${JSON.stringify(location)}: ${conflicts.join('; ')}; rename or reorder these sections, or use --out-order nums or --out-order ignore`
          )
      }
      children.forEach((child, i) => {
        const name = names[i]
        if (result.has(name)) throw new Error(`Filesystem name collision: ${name}`)
        result.set(
          name,
          child.children?.items.length
            ? entries(child, i + 1, false, location === '.' ? name : `${location}/${name}`)
            : formatContent(child, i + 1)
        )
      })
      return result
    }
    const result = entries(output.root, undefined, true)
    return this.options.baseDirname === '.' ? result : new Map([[this.options.baseDirname, result]])
  }
}
