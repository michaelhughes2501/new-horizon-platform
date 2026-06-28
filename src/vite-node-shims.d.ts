// Minimal ambient declarations for Node built-ins used in vite.config.ts,
// avoiding a full @types/node dependency.
declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
