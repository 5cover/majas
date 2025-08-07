import type { Format } from './Format.js';
import type IRNode from './IRNode.js';

export default interface Document {
    format: Format;
    root: IRNode;
}
