import { readFileSync } from 'fs';
import type Document from './Document.js';
import type { Format } from './Format.js';
import type IRNode from './IRNode.js';
import ParseError from './ParseError.js';
import { TextDecoder } from 'util';

export interface Formatter<Input, Output = Input> {
    // NOTE: We use function properties instead of method syntax here to enforce correct parameter variance.
    // In TypeScript, method parameters are bivariant by default — even in strict mode — which allows unsound assignments.
    // Writing the method as a function type ensures contravariant behavior when `strictFunctionTypes` is enabled,
    // preventing accidental misuse like passing incompatible types to a generic consumer.

    parse: (input: Input) => Document;
    emit: (output: Document) => Output;
}

export type Raw = Uint8Array | string;

export function decode(encoding: BufferEncoding, buf: Uint8Array) {
    return new TextDecoder(encoding).decode(buf);
}
export function readFile(encoding: BufferEncoding, path: string) {
    return readFileSync(path, { encoding });
}
export function decodeRawInput(
    input: Raw,
    encoding: BufferEncoding,
    decodeArg: (encoding: BufferEncoding, path: string) => string = readFile,
    decodeStdin: (encoding: BufferEncoding, buf: Uint8Array) => string = decode
) {
    return typeof input === 'string' ? decodeArg(encoding, input) : decodeStdin(encoding, input);
}

export abstract class FormatterBase<Input, Output = Input> implements Formatter<Input, Output> {
    constructor(protected readonly format: Format) {}

    /**
     * Parse a document into the specified format
     * @param input The input data.
     * @returns The parsed document.
     */
    parse(input: Input): Document {
        try {
            return {
                format: this.format,
                root: this.parseImpl(input),
            };
        } catch (err) {
            throw err instanceof ParseError ? err : this.error(input, undefined, err);
        }
    }

    /**
     * Emit a document.
     * The precise output format may change depending on configuration and the format of @p input
     * @param input The document to write.
     */
    abstract emit(input: Document): Output;

    /**
     * The core parsing logic for this format. Returns the root node.
     * Can throw a `ParseError` if known, or any other error for automatic wrapping.
     */
    protected abstract parseImpl(input: Input): IRNode;

    /**
     * Create a parse error for this format instance.
     * Use this method to throw parse errors.
     * @param cause The inner errror.
     * @returns A new parse error.
     */
    protected error(input: unknown, message?: string, cause?: unknown): ParseError {
        return new ParseError(this, String(input), message, cause);
    }
}
