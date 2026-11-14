import * as Filesystem from '../formats/Filesystem.js'
import * as IR from '../formats/IR.js'
import * as Markdown from '../formats/Markdown.js'
import { type Format, type OptionsSchema } from './Format.js'
import { Ajv, type Schema } from 'ajv'
import { wrapValidatorAsTypeGuard } from 'json-schema-to-ts'
import { decodeRawInput, type Raw } from './Formatter.js'
import * as fstree from '../fstree.js'
import { stdout } from 'process'
import { createWriteStream } from 'fs'
import squrlyFormat from 'squrly-format'
import { map } from '../util/misc.js'
import { EOL } from 'os'

const ajv = new Ajv({
  useDefaults: true,
})
const validate = wrapValidatorAsTypeGuard((schema, data) => ajv.validate(schema, data))

const encoding = {
  enum: [
    'ascii',
    'utf8',
    'utf-8',
    'utf16le',
    'utf-16le',
    'ucs2',
    'ucs-2',
    'base64',
    'base64url',
    'latin1',
    'binary',
    'hex',
  ] satisfies BufferEncoding[],
  description: 'text encoding to use',
  default: 'utf-8',
} as const

const optionSchemas = {
  ir: {
    encoding,
    space: {
      oneOf: [
        {
          type: 'string',
        },
        { type: 'integer', minimum: 0 },
      ],
      description:
        'Adds indentation, white space, and line break characters to the output JSON text to make it easier to read. Same syntax as the JSON.stringify space argument',
    },
  },
  md: {
    encoding,
    html: {
      type: 'boolean',
      description: 'Parse or emit generated accessible HTML headings beyond level six.',
      default: false,
    },
    title: {
      enum: ['match', 'filename', 'heading'],
      description:
        'Choose the filesystem filename or stored heading as title, or require a match. Filename mode and renamed paths may not round-trip.',
      default: 'match',
    },
    depth: {
      enum: Markdown.HeadingDepths,
      description:
        'Maximum depth of headings to parse. Headings deeper than this limit will be included as regular content.',
      default: Markdown.DefaultOptions.depth,
    },
  },
  fs: {
    encoding,
    order: {
      enum: ['check', 'nums', 'ignore'],
      default: 'check',
      description:
        'Order sections: check lexicographic order, add numeric prefixes, or ignore order (not roundtrippable).',
    },
    content: {
      type: 'string',
      description:
        'Full content filename for input and output; input otherwise detects a single content file with any extension.',
    },
    relative: {
      type: 'boolean',
      description:
        'Emit titled files with an H1 and rebase contained headings (not roundtrippable for original heading depths).',
      default: false,
    },
    newline: {
      type: 'boolean',
      description: 'Ensure emitted files end with a newline (may change content).',
      default: false,
    },
    basedir: {
      type: 'string',
      description:
        'Wrap the emitted filesystem tree in this directory; non-default values are not automatically reversed.',
      default: Filesystem.DefaultOptions.baseDirname,
    },
    basefile: {
      type: 'string',
      description: 'Content file basename. Extension not included; use content for an explicit filename.',
      default: Filesystem.DefaultOptions.baseFilename,
    },
    replace: {
      type: 'string',
      description:
        'String to replace invalid filename characters. Requires Markdown heading title policy to recover original titles.',
    },
    header: {
      type: 'string',
      description:
        'Symmetric squrly-format prefix for file headers. {title} is the node title, {index} its index and {n} a newline. Renamed titles can prevent reversal.',
    },
    filename: {
      type: 'string',
      description:
        'squrly-format replacement pattern for file names. Renaming may require Markdown heading title policy to recover titles.',
    },
  },
} as const satisfies Record<string, Schema>

export default [
  {
    displayName: 'IR',
    aliases: [] as string[],
    fileExtensions: [] as string[],
    optionsSchema: optionSchemas.ir,
    accepts: 'IRNode JSON',
    emits: 'IRNode JSON',
    create(options) {
      const o = parseOptions(options, optionSchemas.ir)
      const irFormatter = new IR.default(this, o.space)
      return {
        parse(input) {
          return irFormatter.parse(decodeRawInput(input, o.encoding))
        },
        emit(output, location) {
          textEmit(location, irFormatter.emit(output))
        },
      }
    },
  },
  {
    displayName: 'Markdown',
    fileExtensions: ['md', 'markdown', 'mdown', 'mkdn', 'mkd', 'mdwn', 'mkdown', 'ron'],
    aliases: ['md'],
    optionsSchema: optionSchemas.md,
    accepts: 'markdown markup text',
    emits: 'markdown markup text',
    serializeSection: Markdown.serializeSection,
    canOmitSectionContent: Markdown.canOmitSectionContent,
    create(options) {
      const o = parseOptions(options, optionSchemas.md)
      const mdFormatter = new Markdown.default(this, o)
      return {
        parse(input) {
          return mdFormatter.parse(decodeRawInput(input, o.encoding))
        },
        emit(output, location) {
          textEmit(location, mdFormatter.emit(output))
        },
      }
    },
  },
  {
    displayName: 'Filesystem',
    aliases: ['fs'],
    fileExtensions: [],
    optionsSchema: optionSchemas.fs,
    accepts: 'a filesystem path',
    emits: 'a filesystem subtree at the output location or the current directory if unspecified.',
    create(options) {
      const o = parseOptions(options, optionSchemas.fs)
      const fsFormatter = new Filesystem.default(this, {
        baseDirname: o.basedir,
        baseFilename: o.basefile,
        contentFilename: o.content,
        order: o.order,
        relativeHeadings: o.relative,
        trailingNewline: o.newline,
        invalidFilenameCharReplacement: o.replace,
        header: map(fmt => (title, index) => squrlyFormat(fmt, { title, index, n: EOL }), o.header),
        filename: map(fmt => (title, index) => squrlyFormat(fmt, { title, index, n: EOL }), o.filename),
      })
      return {
        parse(input) {
          const title = decodeRawInput(input, o.encoding, (_, input) => input)
          return fsFormatter.parse({
            title,
            children: fstree.read(title, o.encoding),
          })
        },
        emit(output, location) {
          fstree.write(fsFormatter.emit(output), location ?? '.')
        },
      }
    },
  },
] as const satisfies Format[]

function textEmit(location: string | undefined, output: Raw) {
  const f = location === undefined ? stdout : createWriteStream(location)
  f.write(output)
}

function parseOptions<Schema extends OptionsSchema>(options: unknown, schema: Schema) {
  if (validate({ type: 'object', properties: schema, additionalProperties: false } as const, options)) {
    return options
  } else {
    throw new Error(`Invalid options: ${ajv.errorsText(ajv.errors)}: ${JSON.stringify(options)}`)
  }
}
