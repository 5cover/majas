// CLI interface entry
import { program as baseProgram } from '@commander-js/extra-typings';
import pkg from '../package.json' with { type: 'json' };
import { stdin, stdout } from 'process';
import { createWriteStream } from 'fs';
import type { Format, Options } from './core/Format.js';
import formats from './core/formats.js';

const program = baseProgram
    .name('majas')
    .description('Markdown And JSON Are Similar - format-agnostic structured data converter')
    .version(pkg.version)
    .option('-4, --from <format>', 'Source format')
    .option(
        '-2, --to <format>',
        'Target format. If absent, Majas simply outputs the resolved input format and no conversion is performed.'
    )
    .option('-o, --out <file>', 'Output file')
    .option(
        '-i, --infer',
        'Infer input format from file extension; treat `--from` as a fallback on ambiguous input'
    )
    .helpOption(false)
    .option('--help [format]', 'Get general help or help for a specific format')
    .allowUnknownOption()
    .argument('[args...]')
    .parse();

const o = program.opts();

if (o.help !== undefined) {
    if (typeof o.help === 'string') {
        program.addHelpText('after', `\nHELP FOR FORMAT '${o.help}'`);
    }
    program.help();
}

const output = o.out === undefined ? stdout : createWriteStream(o.out);
const args = parseArgs(program.args);

const sourceFormat = ((): Format => {
    if (o.infer) {
        const inferred = inferFormat(args.inputFile);
        if (inferred) return inferred;
        if (o.from !== undefined) {
            console.log('fallback to --from');
            return findFormat(o.from);
        }
        return program.error(`could not infer input format for ${args.inputFile}`);
    }
    if (o.from !== undefined) return findFormat(o.from);
    return program.error(`missing --from option`);
})();

if (o.to === undefined) {
    console.log(sourceFormat.displayName);
} else {
    const ir = sourceFormat.create(args.outputOptions).parse(args.inputFile ?? stdin.read());
    const result = findFormat(o.to).create(args.outputOptions).emit(ir);
    output.write(result);
}

function inferFormat(file: string | undefined): Format | undefined {
    return undefined;
}

function findFormat(name: string): Format {
    name = name.toLowerCase();
    for (const format of formats) {
        if (format.displayName.toLowerCase() == name || (format.aliases as string[]).includes(name))
            return format;
    }
    return program.error(`invalid format: ${o.from}`);
}

function parseArgs(args: readonly string[]) {
    let inputFile: string | undefined;

    const inputOptions: Options = {};
    const outputOptions: Options = {};
    const option: {
        bag: Options;
        key?: string;
    } = { bag: inputOptions };
    let processOptions = true;

    let i = 0;
    for (const arg of args) {
        i++;
        if (
            processOptions &&
            (detectPrefix(arg, inputOptions, '-i') ||
                detectPrefix(arg, inputOptions, '--in-') ||
                detectPrefix(arg, outputOptions, '-o') ||
                detectPrefix(arg, outputOptions, '--out-'))
        ) {
            continue;
        }
        if (option.key !== undefined) {
            option.bag[option.key] = arg;
            continue;
        }
        if (inputFile === undefined) {
            inputFile = arg;
            continue;
        }
        program.error(`i don't know what to do with this argument: '${arg}' (position ${i})`);
    }
    return {
        inputFile,
        inputOptions,
        outputOptions,
    };

    function detectPrefix(arg: string, bag: Options, prefix: string) {
        return (
            arg.startsWith(prefix) &&
            ((option.bag = bag)[(option.key = arg.slice(prefix.length))] = true)
        );
    }
}
