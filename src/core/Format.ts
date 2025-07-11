import type IRNode from './IRNode.js';
import type Document from './Document.js';
import ParseError from './ParseError.js';

export default abstract class Format<Input = string, Output = Input> {
    abstract readonly name: string;

    /**
     * Parse a document into the specified format
     * @param input The input data.
     * @returns The parsed node.
     */
    parse(input: Input): IRNode {
        try {
            return this.parseImpl(input);
        } catch (err) {
            throw err instanceof ParseError ? err : this.error(input, err);
        }
    }

    /**
     * Write a document.
     * The precise output format may change depending on configuration and the format of @p input
     * @param input The document to write.
     */
    abstract write(input: Document): Output;

    /**
     * The core parsing logic for this format.
     * Can throw a `ParseError` if known, or any other error for automatic wrapping.
     */
    protected abstract parseImpl(input: Input): IRNode;
    /**
     * Create a parse error for this format instance.
     * Use this method to throw parse errors.
     * @param cause The inner errror.
     * @returns A new parse error.
     */
    protected error(input: Input, cause?: unknown): ParseError {
        return new ParseError(this, String(input), cause);
    }
}
