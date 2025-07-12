import type Document from '../core/Document.js';
import Format from '../core/Format.js';
import { Ajv } from 'ajv';
import { IRNodeSchema } from '../core/IRNode.js';
import type IRNode from '../core/IRNode.js';
const validateIRNode = new Ajv().compile(IRNodeSchema);

interface Options {
    space?: string | number;
    parseReviver?: (this: unknown, key: string, value: unknown) => unknown;
}

export default class IR extends Format {
    override readonly name = 'IR';
    constructor(private readonly options: Options = {}) {
        super();
    }
    override parseImpl(input: string): Document {
        const root = JSON.parse(input);
        if (!validateIRNode(root))
            throw this.error(input, 'invalid IRNode structure', validateIRNode.errors);
        return { format: this, root: root as IRNode };
    }
    override emit(input: Document): string {
        return JSON.stringify(input.root, null, this.options.space);
    }
}
