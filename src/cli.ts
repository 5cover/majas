#!/usr/bin/env node
import { program as baseProgram } from '@commander-js/extra-typings';
import pkg from '../package.json' with { type: 'json' };
import type { Format } from './core/Format.js';
import formats from './core/formats.js';
import { findFormat, inferFormat, map, preprocessOptionsArgs, readFromStdin } from './util/misc.js';

const formatOptions = preprocessOptionsArgs(process.argv.slice(2));
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
    .option('--help [format]', 'Get general help or help for a specific format')
    .helpOption(false)
    .argument('[FILE]')
    .parse(formatOptions.args, { from: 'user' });

const o = program.opts();

if (o.help !== undefined) {
    program.addHelpText(
        'after',
        `  -i<option>, --in-<option>   Pass an option to the input format
  -o<option>, --out-<option>  Pass an option to the output format\n` +
            (typeof o.help === 'string'
                ? (map(formatHelp, findFormat(o.help)) ??
                  `\n${invalidFormatMsg(o.help)}\n${formatsHelp()}`)
                : formatsHelp())
    );
    program.help();
}

const sourceFormat = ((): Format => {
    if (o.infer) {
        let inferred = map(inferFormat, program.args[0]);
        if (!inferred && o.from !== undefined) {
            console.log('fallback to --from');
            inferred = findFormat(o.from);
        }
        return (
            inferred ??
            program.error(
                'could not infer input format' + (program.args[0] ? ` for ${program.args[0]}` : '')
            )
        );
    }
    return (
        map(findFormat, o.from ?? program.error(`missing --from option`)) ??
        program.error(`invalid format: ${o.from}`)
    );
})();

if (o.to === undefined) {
    console.log(sourceFormat.displayName);
} else {
    const outFormat = findFormat(o.to) ?? program.error(invalidFormatMsg(o.to));
    const ir = sourceFormat
        .create(formatOptions.input)
        .parse(program.args[0] ?? (await readFromStdin()));
    outFormat.create(formatOptions.output).emit(ir, o.out);
}

function formatsHelp() {
    return `\nFormats:
  ${formats.map(f => [f.displayName, ...f.aliases].join(', ')).join('\n  ')}

Note: format names are case-insensitive.\n`;
}

function formatHelp(format: Format) {
    const options = map(opts => {
        const optEntries = Object.entries(opts);
        const maxLength = Math.max(...optEntries.map(([k]) => k.length));
        return optEntries.map(([option, schema]) => {
            const desc =
                typeof schema === 'object' &&
                schema.description +
                    (schema.default ? ` (default value: ${String(schema.default)})` : '');
            return desc ? `${option.padEnd(maxLength)}  ${desc}` : option;
        });
    }, format.optionsSchema) ?? ['(no options)'];
    return `\nHelp for format ${o.help}:
  ${[format.displayName, ...format.aliases].join(', ')}
  Accepts: ${format.accepts}
  Emits: ${format.emits}

${o.help} options:
  ${options.join('\n  ')}\n`;
}

function invalidFormatMsg(format: string) {
    return `invalid format: ${format}`;
}
