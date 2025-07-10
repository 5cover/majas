import type Format from './Format.js';

/**
 * An error thrown when a format parser fails to convert input into a valid IRNode.
 */
export default class ParseError extends Error {
    /** The raw input string that caused the parse to fail (may be trimmed) */
    public readonly input: string;
    constructor(format: Format<unknown>, input: string, cause?: unknown) {
        const trimmedInput = input.length > 1000 ? input.slice(0, 1000) + '…' : input;
        super(
            `failed to parse ${format.name}: ${cause !== undefined ? cause + ': ' : ''}input: ${trimmedInput}`
        );
        this.name = 'ParseError';
        this.input = input;
        this.cause = cause;
    }
}
