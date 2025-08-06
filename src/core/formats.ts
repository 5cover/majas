import FilesystemFormatter from '../formats/Filesystem.js';
import IRFormatter from '../formats/IR.js';
import MarkdownFormatter from '../formats/Markdown.js';
import { type Format, type OptionsSchema } from './Format.js';
import { Ajv } from 'ajv';
import { wrapValidatorAsTypeGuard } from 'json-schema-to-ts';
import { decodeRawInput, type Raw } from './Formatter.js';
import * as fstree from '../fstree.js';
import { stdout } from 'process';
import { createWriteStream } from 'fs';

const ajv = new Ajv({
    useDefaults: true,
});
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
            if (typeof o.space === 'string') {
                const spaceN = parseInt(o.space);
                if (spaceN >= 0) o.space = spaceN;
            }
            const irFormatter = new IRFormatter(this, o.space);
            return {
                parse(input) {
                    return irFormatter.parse(decodeRawInput(input, o.encoding));
                },
                emit(output, location) {
                    textEmit(location, irFormatter.emit(output));
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
                emit(output, location) {
                    textEmit(location, mdFormatter.emit(output));
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
        emits: 'a filesystem subtree at the output location or the current directory if unspecified.',
        create(options) {
            const o = parseOptions(options, optionSchemas.fs);
            const fsFormatter = new FilesystemFormatter(this);
            return {
                parse(input) {
                    const title = decodeRawInput(input, o.encoding, x => x);
                    return fsFormatter.parse({
                        title,
                        children: fstree.read(title, o.encoding),
                    });
                },
                emit(output, location) {
                    fstree.write(fsFormatter.emit(output), location ?? '.');
                },
            };
        },
    },
] as const satisfies Format[];

function textEmit(location: string | undefined, output: Raw) {
    const f = location === undefined ? stdout : createWriteStream(location);
    f.write(output);
}

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
