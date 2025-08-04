export function throwf(e: unknown): never {
    throw e;
}

export function map<T, U>(map: (t: T) => U, t: T | undefined) {
    return t === undefined ? undefined : map(t);
}
