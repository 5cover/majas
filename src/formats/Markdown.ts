import type * as md from 'mdast'
import type IRNode from '../core/IRNode.js'
import type Document from '../core/Document.js'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { decodeNamedCharacterReference } from 'decode-named-character-reference'
import { decodeNumericCharacterReference } from 'micromark-util-decode-numeric-character-reference'
import { normalizePartial, throwf } from '../util/misc.js'
import { FormatterBase } from '../core/Formatter.js'
import type { Format } from '../core/Format.js'

export const HeadingDepths = [1, 2, 3, 4, 5, 6] as const satisfies md.Heading['depth'][]

export interface Options {
  depth: md.Heading['depth']
  html?: boolean
  title?: 'match' | 'filename' | 'heading'
}

export const DefaultOptions = {
  depth: 6,
  html: false,
  title: 'match',
} as const satisfies Options

export default class Markdown extends FormatterBase<string> {
  private readonly options: Readonly<Required<Options>>
  constructor(format: Format, options?: Partial<Readonly<Options>>) {
    super(format)
    this.options = normalizePartial<Required<Options>>(DefaultOptions, options)
  }
  private input!: string
  protected override parseImpl(input: string): IRNode {
    this.input = input
    const root = fromMarkdown(input)
    return this.md2ir(root)
  }
  override emit(output: Document): string {
    const sections: string[] = []
    const filesystem = output.format.displayName === 'Filesystem'
    const walk = (node: IRNode, depth: number, root: boolean) => {
      let title = node.title
      let content = node.content
      if (filesystem && title !== undefined) title = title.replace(/^.*[\\/]/, '')
      if (filesystem && content !== undefined && title !== undefined) {
        title = title.replace(/\.(?:md|markdown|mdown|mkdn|mkd|mdwn|mkdown|ron)$/i, '')
        const parsed = fromMarkdown(content)
        const first = parsed.children[0]
        if (first && isHeading(first) && first.depth === 1) {
          const heading = headingTitle(content, first)
          if (this.options.title === 'match' && heading !== title)
            throw new Error(`File title does not match its H1: ${title} / ${heading}`)
          if (this.options.title === 'heading') title = heading
          content = content
            .slice(first.position?.end.offset ?? throwf(new Error('missing heading end offset')))
            .trimStart()
        }
        content = rebaseHeadings(content, depth + 1, this.options.html)
      }
      if (title !== undefined) sections.push(renderHeading(title, depth, this.options.html))
      else if (!root) throw new Error('Cannot emit an untitled non-root node as Markdown')
      if (content) sections.push(content)
      const childDepth = title === undefined ? depth : depth + 1
      node.children?.items.forEach(child => walk(child, childDepth, false))
    }
    walk(output.root, 1, true)
    return sections.join('\n\n')
  }

  private md2ir(parent: md.Parent): IRNode {
    // initialized to a H0 (node englobing the whole document)
    const h0children: IRNode[] = []
    const h0: IRNode = {
      children: { ordered: true, items: h0children },
    }
    const stack: (readonly [number, IRNode[]])[] = [[0, h0children]]
    let lastHeading = h0
    let previousHeadingEndOffset = 0
    for (const n of parent.children) {
      const heading = isHeading(n)
        ? n.depth <= this.options.depth
          ? { depth: n.depth, title: this.getSource(n.children) }
          : undefined
        : this.options.html && this.options.depth === 6 && n.type === 'html'
          ? parseHtmlHeading(n.value)
          : undefined
      if (!heading) continue
      const content = this.input
        .substring(previousHeadingEndOffset, n.position?.start.offset ?? throwf(new Error('missing node start offset')))
        .trim()
      if (content) lastHeading.content = content
      while (stack[stack.length - 1][0] >= heading.depth) {
        stack.pop()
      }
      const newScope: IRNode[] = []
      stack[stack.length - 1][1].push(
        (lastHeading = {
          // Get raw child source
          title: heading.title,
          children: { ordered: true, items: newScope },
        })
      )
      stack.push([heading.depth, newScope])
      previousHeadingEndOffset = n.position?.end.offset ?? throwf(new Error('missing node end offset'))
    }

    const trailingContent = this.input.substring(previousHeadingEndOffset).trim()

    if (trailingContent) {
      lastHeading!.content = (lastHeading!.content ?? '') + trailingContent
    }
    return h0
  }

  private getSource(nodes: readonly md.Node[]): string {
    const l = nodes.length
    return l
      ? this.input.substring(
          nodes[0].position?.start.offset ?? throwf(new Error('missing node start offset')),
          nodes[l - 1].position?.end.offset ?? throwf(new Error('missing node end offset'))
        )
      : ''
  }
}

function isHeading(node: md.Node): node is md.Heading {
  return node.type === 'heading'
}

function headingTitle(input: string, heading: md.Heading): string {
  const first = heading.children[0]
  const last = heading.children[heading.children.length - 1]
  return first && last ? input.slice(first.position?.start.offset, last.position?.end.offset) : ''
}

function parseHtmlHeading(value: string): { depth: number; title: string } | undefined {
  const match =
    /^<div role="heading" aria-level="([1-9]\d*)">((?:[^<>&"\r\n]|&(?:amp|lt|gt|quot|NewLine|#13);)*)<\/div>$/.exec(
      value
    )
  if (!match) return undefined
  const depth = Number(match[1])
  if (!Number.isSafeInteger(depth) || depth <= 6) return undefined
  const title = match[2].replace(/&(amp|lt|gt|quot|NewLine|#13);/g, (_, name: string) =>
    name === '#13'
      ? decodeNumericCharacterReference('13', 10)
      : decodeNamedCharacterReference(name) || throwf(new Error('invalid character reference'))
  )
  return { depth, title }
}

export function renderHeading(title: string, depth: number, html: boolean): string {
  if (depth <= 6) return `${'#'.repeat(depth)} ${title}`
  if (!html) throw new Error(`Markdown heading depth ${depth} exceeds six; enable HTML headings`)
  const escaped = title
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\n', '&NewLine;')
    .replaceAll('\r', '&#13;')
  return `<div role="heading" aria-level="${depth}">${escaped}</div>`
}

export function rebaseHeadings(input: string, firstDepth: number, html = false): string {
  const headings = fromMarkdown(input).children.filter(isHeading)
  if (!headings.length) return input
  const base = Math.min(...headings.map(heading => heading.depth))
  let result = input
  for (const heading of headings.reverse()) {
    const start = heading.position?.start.offset ?? throwf(new Error('missing heading start offset'))
    const end = heading.position?.end.offset ?? throwf(new Error('missing heading end offset'))
    result =
      result.slice(0, start) +
      renderHeading(headingTitle(input, heading), heading.depth - base + firstDepth, html) +
      result.slice(end)
  }
  return result
}
