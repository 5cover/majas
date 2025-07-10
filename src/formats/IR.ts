import type Document from '../core/Document.js';
import Format from '../core/Format.js';
import type IRNode from '../core/IRNode.js';

interface Options {
    space?: string | number;
    parseReviver?: (this: unknown, key: string, value: unknown) => unknown;
}

export default class IR extends Format {
    readonly name = 'IR';
    constructor(private readonly options: Options = {}) {
        super();
    }
    parseImpl(input: string): IRNode {
        return JSON.parse(input, this.options.parseReviver); // todo: validate contents
    }
    print(input: Document): string {
        return JSON.stringify(input.root, null, this.options.space);
    }
}
