import { describe, it, expect } from 'vitest';
import reactHooks from 'eslint-plugin-react-hooks';
import config from './eslint.config.js';

// Regression coverage for the fix in this PR: a previous version of this file
// spread `reactHooks.configs.recommended.rules` into the rules object, which
// silently re-enabled the React Compiler-oriented rules bundled into
// eslint-plugin-react-hooks v7's "recommended" preset (e.g. set-state-in-effect,
// purity, gating). Those rules flag idiomatic React 18 data-fetching patterns
// (calling a function defined via useState/useEffect-adjacent closures) as
// errors, which is exactly the bug that caused the hook-ordering churn fixed
// alongside this PR. These tests assert that the "react-hooks" block in the
// flat config only ever contains the two long-standing rules, explicitly, and
// that the compiler-oriented rules the recommended preset would introduce are
// never present.

// Find the config object in the flat-config array that actually declares the
// react-hooks plugin / rules (the tseslint.config() call returns an array of
// config objects, several of which are just `{ ignores: [...] }`).
function findReactHooksBlock(flatConfig) {
  return flatConfig.find(
    (block) => block && block.plugins && block.plugins['react-hooks']
  );
}

describe('eslint.config.js', () => {
  it('exports an array of flat config objects', () => {
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
  });

  it('has exactly one block that registers the react-hooks plugin', () => {
    const blocks = config.filter(
      (block) => block && block.plugins && block.plugins['react-hooks']
    );
    expect(blocks).toHaveLength(1);
  });

  describe('react-hooks rules', () => {
    const block = findReactHooksBlock(config);

    it('is present and applies to .ts/.tsx files', () => {
      expect(block).toBeDefined();
      expect(block.files).toContain('**/*.{ts,tsx}');
    });

    it('sets react-hooks/rules-of-hooks to "error"', () => {
      expect(block.rules['react-hooks/rules-of-hooks']).toBe('error');
    });

    it('sets react-hooks/exhaustive-deps to "warn"', () => {
      expect(block.rules['react-hooks/exhaustive-deps']).toBe('warn');
    });

    it('does not spread the full recommended rules preset', () => {
      // Every rule key present in this block that starts with "react-hooks/"
      // must be one of the two long-standing rules. If the recommended
      // preset were spread in again, this would fail because additional
      // compiler-oriented keys (set-state-in-effect, purity, gating, etc.)
      // would appear.
      const reactHooksRuleKeys = Object.keys(block.rules).filter((key) =>
        key.startsWith('react-hooks/')
      );

      expect(reactHooksRuleKeys.sort()).toEqual(
        ['react-hooks/exhaustive-deps', 'react-hooks/rules-of-hooks'].sort()
      );
    });

    it('does not include any of the compiler-oriented rules from the v7 recommended preset', () => {
      const recommendedRuleKeys = Object.keys(
        reactHooks.configs.recommended.rules
      );
      const compilerOrientedKeys = recommendedRuleKeys.filter(
        (key) =>
          key !== 'react-hooks/rules-of-hooks' &&
          key !== 'react-hooks/exhaustive-deps'
      );

      // Sanity check: the installed plugin version does in fact ship extra
      // compiler-oriented rules beyond the two long-standing ones. If this
      // ever becomes empty, the regression this test guards against can no
      // longer occur, but the assertions below still hold trivially.
      expect(compilerOrientedKeys.length).toBeGreaterThan(0);

      for (const key of compilerOrientedKeys) {
        expect(block.rules).not.toHaveProperty(key);
      }
    });
  });

  describe('other configured rules', () => {
    const block = findReactHooksBlock(config);

    it('keeps react-refresh/only-export-components configured', () => {
      expect(block.rules['react-refresh/only-export-components']).toEqual([
        'warn',
        { allowConstantExport: true },
      ]);
    });

    it('keeps the typescript-eslint no-unused-vars override', () => {
      expect(block.rules['@typescript-eslint/no-unused-vars']).toEqual([
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ]);
    });
  });
});