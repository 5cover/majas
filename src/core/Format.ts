import type { JSONSchema } from 'json-schema-to-ts';
import type { Formatter, Raw } from './Formatter.js';

export type Options = Partial<Record<string, string | true>>;

export type OptionsSchema = Record<string, JSONSchema>;

export interface Format {
    displayName: string;
    aliases: readonly string[];
    fileExtensions: readonly string[];
    /** Maps from options to their description/format, etc. to display in help output. */
    optionsSchema: OptionsSchema;
    accepts: string;
    sideEffects?: string;
    emits: string;
    create(options: Readonly<Options>): Formatter<Raw, Raw>;
}
