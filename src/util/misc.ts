import type { Options } from '../core/Format.js';

export function throwf(e: unknown): never {
    throw e;
}

export function map<T, U>(map: (t: T) => U, t: T | undefined) {
    return t === undefined ? undefined : map(t);
}

/**
 * Extracts input/output format option arguments, removing them from the arrray so Commander can safely parse the remaining arguments.
 * @param args The arguments array
 * @returns The extracted input an output format options, and the new arguments.
 */
export function preprocessOptionsArgs(args: readonly string[]) {
    const input: Options = {};
    const output: Options = {};
    const option: {
        bag: Options;
        key?: string;
    } = { bag: input };
    let processOptions = true;
    const newArgs: string[] = [];
    for (const arg of args) {
        if (arg === '--') {
            processOptions = false;
        }
        if (
            processOptions &&
            (detectPrefix(arg, input, '-i') ||
                detectPrefix(arg, input, '--in-') ||
                detectPrefix(arg, output, '-o') ||
                detectPrefix(arg, output, '--out-'))
        ) {
            /* empty */
        } else if (option.key !== undefined) {
            option.bag[option.key] = arg;
            option.key = undefined;
        } else {
            newArgs.push(arg);
        }
    }
    return {
        input,
        output,
        args: newArgs,
    };

    function detectPrefix(arg: string, bag: Options, prefix: string) {
        return (
            arg.startsWith(prefix) &&
            ((option.bag = bag)[(option.key = arg.slice(prefix.length))] = true)
        );
    }
}

export async function readFromStdin() {
    return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = [];

        process.stdin.on('data', chunk => {
            chunks.push(chunk);
        });

        process.stdin.on('end', () => {
            resolve(Buffer.concat(chunks));
        });

        process.stdin.on('error', reject);
    });
}
