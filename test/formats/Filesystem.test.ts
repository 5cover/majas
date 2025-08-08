import { describe, it } from 'node:test';
import formats from '../../src/core/formats.js';
import assert from 'node:assert/strict';
import Filesystem, { type Options } from '../../src/formats/Filesystem.js';
import type { FSTree } from '../../src/fstree.js';

function filesystem(options?: Readonly<Partial<Options>>) {
    return new Filesystem(formats[2], options);
}

const testFormat = formats[1];

describe('Filesystem formatter', () => {
    it('emits an anonymous empty node', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {},
            }),
            new Map([['.', new Map()]])
        );
    });
    it('emits a named empty node', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {
                    title: 'empty',
                },
            }),
            new Map([['empty', new Map()]])
        );
    });
    it('emits an anonymous content node', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {
                    content: 'hello',
                },
            }),
            new Map([[`out.${testFormat.fileExtensions[0]}`, 'hello']])
        );
    });
    it('emits a named content node', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {
                    title: 'file',
                    content: 'hello',
                },
            }),
            new Map([[`file.${testFormat.fileExtensions[0]}`, 'hello']])
        );
    });
    it('emits an empty anonymous directory', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {
                    children: {
                        ordered: true,
                        items: [],
                    },
                },
            }),
            new Map([['.', new Map()]])
        );
    });
    it('emits an empty named directory', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {
                    title: 'dir',
                    children: {
                        ordered: true,
                        items: [],
                    },
                },
            }),
            new Map([[`dir`, new Map()]])
        );
    });
    it('emits a directory with one named file', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {
                    children: {
                        ordered: true,
                        items: [
                            {
                                title: 'file',
                                content: 'hello',
                            },
                        ],
                    },
                },
            }),
            new Map([[`.`, new Map([[`file.${testFormat.fileExtensions[0]}`, 'hello']])]])
        );
    });
    it('emits a directory of unnamed files', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {
                    children: {
                        ordered: true,
                        items: [
                            {
                                content: 'hello0',
                            },
                            {
                                content: 'hello1',
                            },
                            {
                                content: 'hello2',
                            },
                        ],
                    },
                },
            }),
            new Map([
                [
                    `.`,
                    new Map([
                        [`1.${testFormat.fileExtensions[0]}`, 'hello0'],
                        [`2.${testFormat.fileExtensions[0]}`, 'hello1'],
                        [`3.${testFormat.fileExtensions[0]}`, 'hello2'],
                    ]),
                ],
            ])
        );
    });
    it('emits content and directory', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {
                    content: 'contentfulness',
                    children: {
                        ordered: true,
                        items: [
                            {
                                content: 'childrenity',
                            },
                        ],
                    },
                },
            }),
            new Map<string, FSTree>([
                [`out.${testFormat.fileExtensions[0]}`, 'contentfulness'],
                ['.', new Map([[`1.${testFormat.fileExtensions[0]}`, 'childrenity']])],
            ])
        );
    });

    it('emits a named empty node with illegal filename characters', () => {
        assert.deepEqual(
            filesystem().emit({
                format: testFormat,
                root: {
                    title: 'em/pty',
                },
            }),
            new Map([['empty', new Map()]])
        );
    });

    it('emits a named empty node with illegal filename characters and replaces them', () => {
        assert.deepEqual(
            filesystem({
                invalidFilenameCharReplacement: '_',
            }).emit({
                format: testFormat,
                root: {
                    title: 'em/pty',
                },
            }),
            new Map([['em_pty', new Map()]])
        );
    });

    it('emits a named content with illegal filename characters with replacement and custom header', () => {
        assert.deepEqual(
            filesystem({
                invalidFilenameCharReplacement: '-',
                header: title => `# ${title}\n\n`,
            }).emit({
                format: testFormat,
                root: {
                    title: 'e/mp//y',
                    content: 'hello',
                },
            }),
            new Map([[`e-mp--y.${testFormat.fileExtensions[0]}`, '# e/mp//y\n\nhello']])
        );
    });

    it('emits a directory of files with a custom header and filename', () => {
        assert.deepEqual(
            filesystem({
                header: (title, index) => `${index}:` + (title === undefined ? '' : `${title}:`),
                filename: (title, index) => `${index}.${title}`,
            }).emit({
                format: testFormat,
                root: {
                    children: {
                        ordered: true,
                        items: [
                            {
                                content: 'hello0',
                            },
                            {
                                title: 'hi',
                                content: 'hello1',
                            },
                            {
                                content: 'hello2',
                            },
                        ],
                    },
                },
            }),
            new Map([
                [
                    `.`,
                    new Map([
                        [`1.${testFormat.fileExtensions[0]}`, '1:hello0'],
                        [`2.hi.${testFormat.fileExtensions[0]}`, '2:hi:hello1'],
                        [`3.${testFormat.fileExtensions[0]}`, '3:hello2'],
                    ]),
                ],
            ])
        );
    });
});
