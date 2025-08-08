// majas API: type-aware, format-agnostic conversion

import type IRNode from './core/IRNode.js';
import type Document from './core/Document.js';
import type { Format, Options, OptionsSchema } from './core/Format.js';

import formats from './core/formats.js';

export const Formats = formats;

export { inferFormat, findFormat } from './util/misc.js';

export type { IRNode, Document, Format, Options, OptionsSchema };
