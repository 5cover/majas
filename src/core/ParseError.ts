import type { Format } from './Format.js';

/**
 * An error thrown when a format parser fails to convert input into a valid IRNode.
 */
export default class ParseError extends Error {
    /** The raw input string that caused the parse to fail (may be trimmed) */
    public readonly input: string;
    constructor(format: Format, input: string, message?: string, cause?: unknown) {
        super(
            [
                `failed to parse ${format.displayName}`,
                message !== undefined && message,
                cause !== undefined && cause !== null && cause,
                'input',
                input.length > 1000 ? input.slice(0, 1000) + '…' : input,
            ]
                .filter(v => v !== false)
                .join(':')
        );
        this.name = 'ParseError';
        this.input = input;
        this.cause = cause;
    }
}
