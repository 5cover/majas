import fs from 'fs-extra';
import p from 'path';

export type FSTree = string | Map<string, FSTree>;

export function write(tree: FSTree, path: string) {
    if (typeof tree === 'string') {
        fs.writeFileSync(path, tree);
        return;
    }
    fs.ensureDirSync(path);
    for (const [name, child] of tree) {
        write(child, p.resolve(path, name));
    }
}

export function read(item: string | fs.Dirent<string>, encoding: BufferEncoding): FSTree {
    const [path, stat] =
        typeof item === 'string'
            ? [item, fs.statSync(item)]
            : [p.resolve(item.parentPath, item.name), item];
    if (!stat.isDirectory()) {
        return fs.readFileSync(path, encoding);
    }
    const node = new Map<string, FSTree>();
    for (const ent of fs.readdirSync(path, { encoding, withFileTypes: true })) {
        node.set(ent.name, read(ent, encoding));
    }
    return node;
}
