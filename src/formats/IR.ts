import type Document from '../core/Document.js';
import { type Format } from '../core/Format.js';
import { Ajv } from 'ajv';
import { IRNodeSchema } from '../core/IRNode.js';
import type IRNode from '../core/IRNode.js';
import { FormatterBase } from '../core/Formatter.js';

const validateIRNode = new Ajv().compile(IRNodeSchema);

export default class IR extends FormatterBase<string> {
    constructor(
        format: Format,
        private readonly space?: string | number
    ) {
        super(format);
    }
    override parseImpl(input: string) {
        const root = JSON.parse(input);
        if (!validateIRNode(root))
            throw this.error(input, 'invalid IRNode structure', validateIRNode.errors);
        // ignoring the InpuDocu title
        return root as IRNode;
    }
    override emit(output: Document): string {
        return JSON.stringify(output.root, null, this.space);
    }
}
