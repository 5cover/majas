import type { JSONSchema } from 'json-schema-to-ts';
import type { Raw } from './Formatter.js';
import type Document from './Document.js';

export type Options = Partial<Record<string, string | number | true>>;

export type OptionsSchema = Record<string, JSONSchema>;

export interface Format {
    displayName: string;
    aliases: readonly string[];
    fileExtensions: readonly string[];
    /** Maps from options to their description/format, etc. to display in help output. */
    optionsSchema: OptionsSchema;
    accepts: string;
    emits: string;
    create(options: Readonly<Options>): Pipeline;
}

interface Pipeline {
    parse(input: Raw): Document;
    emit(output: Document, location: string | undefined): void;
}
