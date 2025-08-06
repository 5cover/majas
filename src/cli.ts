// CLI interface entry
import { program as baseProgram } from '@commander-js/extra-typings';
import pkg from '../package.json' with { type: 'json' };
import type { Format } from './core/Format.js';
import formats from './core/formats.js';
import { map, preprocessOptionsArgs, readFromStdin } from './util/misc.js';
import * as p from 'path';

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
    let helpText = `  -i<option>, --in-<option>   Pass an option to the input format
  -o<option>, --out-<option>  Pass an option to the output format
`;

    if (typeof o.help === 'string') {
        const format = findFormat(o.help);
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
        helpText += `
Help for format ${o.help}:
  ${[format.displayName, ...format.aliases].join(', ')}
  Accepts: ${format.accepts}
  Emits: ${format.emits}
${o.help} options:
  ${options.join('\n  ')}`;
    } else {
        helpText += `
Formats:
  ${formats.map(f => [f.displayName, ...f.aliases].join(', ')).join('\n  ')}

Note: format names are case-insensitive.`;
    }

    program.addHelpText('after', helpText);
    program.help();
}

const sourceFormat = ((): Format => {
    if (o.infer) {
        const inferred = map(inferFormat, program.args[0]);
        if (inferred) return inferred;
        if (o.from !== undefined) {
            console.log('fallback to --from');
            return findFormat(o.from);
        }
        return program.error(
            'could not infer input format' + (program.args[0] ? ` for ${program.args[0]}` : '')
        );
    }
    if (o.from !== undefined) return findFormat(o.from);
    return program.error(`missing --from option`);
})();

if (o.to === undefined) {
    console.log(sourceFormat.displayName);
} else {
    const ir = sourceFormat
        .create(formatOptions.input)
        .parse(program.args[0] ?? (await readFromStdin()));
    findFormat(o.to).create(formatOptions.output).emit(ir, o.out);
}

function inferFormat(path: string): Format | undefined {
    const ext = p.extname(path).slice(1);
    for (const format of formats) {
        if ((format.fileExtensions as string[]).includes(ext)) {
            return format;
        }
    }
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
