import { memfs } from 'memfs'
import test from 'node:test'
import realFs from 'fs'

const mfs = memfs()
export const volume = mfs.vol
test.beforeEach(() => volume.reset())

// Add fs v9 functions not yet implemented in memfs
Object.defineProperty(mfs.fs.realpath, 'native', {
  value: realFs.realpath.native,
})
Object.defineProperty(mfs.fs.realpathSync, 'native', {
  value: realFs.realpathSync.native,
})

test.mock.module('fs', {
  cache: true,
  // graceful-fs copies property descriptors without symbols. Materialize the
  // memfs stream accessors so its clone does not lose their backing symbol.
  defaultExport: { ...mfs.fs },
})

export const fs = ((await import('fs-extra')) as unknown as { default: typeof import('fs-extra') }).default
