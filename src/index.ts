// majas API: type-aware, format-agnostic conversion

import type IRNode from './core/IRNode.js'
import type Document from './core/Document.js'
import type { Format, Options, OptionsSchema } from './core/Format.js'

import formats from './core/formats.js'
import Markdown from './formats/Markdown.js'
import IR from './formats/IR.js'
import Filesystem from './formats/Filesystem.js'
import type { Options as MarkdownOptions } from './formats/Markdown.js'
import type { FSTreeNode, Options as FilesystemOptions } from './formats/Filesystem.js'
import type { FSTree } from './fstree.js'

export const Formats = formats

export { inferFormat, findFormat } from './util/misc.js'

export function parseMarkdown(input: string, options?: Partial<MarkdownOptions>): Document {
  return new Markdown(formats[1], options).parse(input)
}

export function emitMarkdown(document: Document, options?: Partial<MarkdownOptions>): string {
  return new Markdown(formats[1], options).emit(document)
}

export function parseIR(input: string): Document {
  return new IR(formats[0]).parse(input)
}

export function emitIR(document: Document, space?: string | number): string {
  return new IR(formats[0], space).emit(document)
}

export function parseFilesystem(input: FSTreeNode, options?: Partial<FilesystemOptions>): Document {
  return new Filesystem(formats[2], options).parse(input)
}

export function emitFilesystem(document: Document, options?: Partial<FilesystemOptions>): FSTree {
  return new Filesystem(formats[2], options).emit(document)
}

export type { IRNode, Document, Format, Options, OptionsSchema, MarkdownOptions, FilesystemOptions, FSTreeNode, FSTree }
