import { readFileSync } from 'fs';
import FilesystemFormatter from '../formats/Filesystem.js';
import IRFormatter from '../formats/IR.js';
import MarkdownFormatter from '../formats/Markdown.js';
import { type Format, type OptionsSchema } from './Format.js';
import { Ajv } from 'ajv';
import { wrapValidatorAsTypeGuard } from 'json-schema-to-ts';
import { decodeRawInput } from './Formatter.js';
import * as fstree from '../fstree.js';
import * as p from 'path';

const ajv = new Ajv();
const validate = wrapValidatorAsTypeGuard((schema, data) => ajv.validate(schema, data));

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
} as const;

const optionSchemas = {
    ir: {
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
        encoding,
    },
    md: {
        encoding,
    },
    fs: {
        encoding,
        dir: {
            type: 'string',
            description: 'The directory to create the subtree in',
            default: '.',
        },
    },
} as const;

export default [
    {
        displayName: 'IR',
        aliases: [] as string[],
        fileExtensions: [] as string[],
        optionsSchema: optionSchemas.ir,
        accepts: 'IRNode JSON',
        emits: 'IRNode JSON',
        create(options) {
            const o = parseOptions(options, optionSchemas.ir);
            const irFormatter = new IRFormatter(this, o.space);
            return {
                parse(input) {
                    return irFormatter.parse(decodeRawInput(input, o.encoding));
                },
                emit(output) {
                    return irFormatter.emit(output);
                },
            };
        },
    },
    {
        displayName: 'Markdown',
        fileExtensions: ['md', 'markdown', 'mdown', 'mkdn', 'mkd', 'mdwn', 'mkdown', 'ron'],
        aliases: ['md'],
        optionsSchema: optionSchemas.md,
        accepts: 'markdown markup text',
        emits: 'markdown markup text',
        create(options) {
            const o = parseOptions(options, optionSchemas.md);
            const mdFormatter = new MarkdownFormatter(this);
            return {
                parse(input) {
                    return mdFormatter.parse(decodeRawInput(input, o.encoding));
                },
                emit(output) {
                    return mdFormatter.emit(output);
                },
            };
        },
    },
    {
        displayName: 'Filesystem',
        aliases: ['fs'],
        fileExtensions: [],
        optionsSchema: optionSchemas.fs,
        accepts: 'a filesystem path',
        sideEffects: 'creates of a filesystem subtree',
        emits: 'the path of the created file or directory',
        create(options) {
            const o = parseOptions(options, optionSchemas.fs);
            const fsFormatter = new FilesystemFormatter(this);
            return {
                parse(input) {
                    const title = decodeRawInput(input, o.encoding, x => x);
                    return fsFormatter.parse({
                        title,
                        children: fstree.read(p.resolve(o.dir, title), o.encoding),
                    });
                },
                emit(output) {
                    const tree = fsFormatter.emit(output);
                    fstree.write(tree.children, o.dir);
                    return tree.title;
                },
            };
        },
    },
] as const satisfies Format[];

function parseOptions<Schema extends OptionsSchema>(options: unknown, schema: Schema) {
    if (
        validate(
            { type: 'object', properties: schema, additionalProperties: false } as const,
            options
        )
    ) {
        return options;
    } else {
        throw new Error(`Invalid options: ${ajv.errorsText(ajv.errors)}`);
    }
}
