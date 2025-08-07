import { memfs } from 'memfs';
import test from 'node:test';
import realFs from 'fs';

const mfs = memfs();
export const volume = mfs.vol;
test.beforeEach(() => volume.reset());

// Add fs v9 functions not yet implemented in memfs
// eslint-disable-next-line @typescript-eslint/unbound-method
Object.defineProperty(mfs.fs.realpath, 'native', {
    value: realFs.realpath.native,
});
// eslint-disable-next-line @typescript-eslint/unbound-method
Object.defineProperty(mfs.fs.realpathSync, 'native', {
    value: realFs.realpathSync.native,
});

test.mock.module('fs', {
    cache: true,
    defaultExport: mfs.fs,
});

export const fs = ((await import('fs-extra')) as unknown as { default: typeof import('fs-extra') })
    .default;
