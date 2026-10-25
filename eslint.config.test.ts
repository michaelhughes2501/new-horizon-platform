import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('.', import.meta.url)) });

async function lintHooks(source: string, filePath = 'src/HookFixture.tsx') {
  const [result] = await eslint.lintText(source, { filePath });
  expect(result.fatalErrorCount).toBe(0);
  return result.messages.filter(({ ruleId }) => ruleId?.startsWith('react-hooks/'));
}

describe('React Hooks ESLint configuration', () => {
  it.each(['src/HookFixture.ts', 'src/HookFixture.tsx'])(
    'enables only the intended Hooks rules for %s',
    async (filePath) => {
      const config = await eslint.calculateConfigForFile(filePath);
      const enabledHooks = Object.entries(config.rules)
        .filter(([name, setting]) => name.startsWith('react-hooks/') && setting[0] !== 0)
        .map(([name, setting]) => [name, setting[0]]);

      expect(Object.fromEntries(enabledHooks)).toEqual({
        'react-hooks/rules-of-hooks': 2,
        'react-hooks/exhaustive-deps': 1,
      });
    },
  );

  it('still rejects conditional Hook calls as errors', async () => {
    const messages = await lintHooks(`
      import { useState } from 'react';
      export function Example({ enabled }: { enabled: boolean }) {
        if (enabled) useState(0);
        return null;
      }
    `);

    expect(messages).toEqual([
      expect.objectContaining({ ruleId: 'react-hooks/rules-of-hooks', severity: 2 }),
    ]);
  });

  it('still reports missing effect dependencies as warnings', async () => {
    const messages = await lintHooks(`
      import { useEffect } from 'react';
      export function Example({ user }: { user: { id: string } }) {
        useEffect(() => { console.log(user); }, []);
        return null;
      }
    `);

    expect(messages).toEqual([
      expect.objectContaining({ ruleId: 'react-hooks/exhaustive-deps', severity: 1 }),
    ]);
  });

  it('accepts complete dependencies and effect-driven state updates', async () => {
    // Reintroducing the v7 recommended spread enables set-state-in-effect here.
    expect(await lintHooks(`
      import { useEffect, useState } from 'react';
      export function Example({ user }: { user: { name: string } }) {
        const [name, setName] = useState('');
        useEffect(() => { setName(user.name); }, [user]);
        return <span>{name}</span>;
      }
    `)).toEqual([]);
  });

  it('does not enable Compiler purity diagnostics during rendering', async () => {
    expect(await lintHooks(`
      export function Example() {
        return <span>{Date.now()}</span>;
      }
    `)).toEqual([]);
  });
});
