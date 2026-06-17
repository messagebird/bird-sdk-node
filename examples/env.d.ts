// Examples run under a Node-like runtime; declare the one global they read so
// the type-check needs no @types/node dependency. Not a snippet source.
declare const process: { env: Record<string, string | undefined> };
