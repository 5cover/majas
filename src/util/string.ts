/**
 * Modify a string a little as possible until it doesn't equal any string from a list
 * @param individual Individual string that must be unique
 * @param inCrowd Population of strings that must not include the modified individual
 * @returns The individual or it modified as little as possible to be unique from crowd in an implementation-defined manner.
 */
export function uniqify(individual: string, inCrowd: (candidate: string) => boolean) {
    let n = 1;
    let modividual = individual;
    while (inCrowd(modividual)) {
        modividual = `${individual} (${n++})`;
    }
    return modividual;
}
