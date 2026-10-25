import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface LockedPackage {
  version?: string;
  resolved?: string;
  integrity?: string;
  optional?: boolean;
  cpu?: string[];
  os?: string[];
  optionalDependencies?: Record<string, string>;
}

const lock: { packages: Record<string, LockedPackage> } = JSON.parse(
  readFileSync(new URL('./package-lock.json', import.meta.url), 'utf8'),
);
const rolldown = lock.packages['node_modules/rolldown'];
const bindings = Object.entries(rolldown.optionalDependencies ?? {})
  .filter(([name]) => name.startsWith('@rolldown/binding-'));

describe('Rolldown optional native bindings in the lockfile', () => {
  it('retains the native binding declarations', () => {
    expect(bindings.length).toBeGreaterThan(0);
  });

  it.each(bindings)('locks %s at the declared version with install metadata', (name, version) => {
    // Check every declared target, even on hosts where npm skips installing it.
    expect(lock.packages[`node_modules/${name}`]).toEqual(expect.objectContaining({
      version,
      optional: true,
      resolved: expect.stringMatching(/^https:\/\//),
      integrity: expect.stringMatching(/^sha512-/),
    }));
  });

  it.each([
    ['linux-x64-gnu', 'linux', 'x64'],
    ['linux-x64-musl', 'linux', 'x64'],
    ['linux-arm64-gnu', 'linux', 'arm64'],
    ['linux-arm64-musl', 'linux', 'arm64'],
    ['darwin-x64', 'darwin', 'x64'],
    ['darwin-arm64', 'darwin', 'arm64'],
    ['win32-x64-msvc', 'win32', 'x64'],
    ['win32-arm64-msvc', 'win32', 'arm64'],
  ])('preserves platform constraints for %s', (target, os, cpu) => {
    const name = `@rolldown/binding-${target}`;
    expect(rolldown.optionalDependencies).toHaveProperty(name, rolldown.version);
    expect(lock.packages[`node_modules/${name}`]).toEqual(expect.objectContaining({
      version: rolldown.version,
      os: [os],
      cpu: [cpu],
      optional: true,
    }));
  });
});
