import { describe, it, expect } from 'vitest';
import { sanitise } from './index';

// Tests scoped to the sanitise function, which was refactored in this PR
// from an iterative do-while loop to a single-pass chain of .replace() calls.

describe('sanitise', () => {
  // ── Non-string inputs ────────────────────────────────────────
  describe('non-string inputs', () => {
    it('returns empty string for a number', () => {
      expect(sanitise(42)).toBe('');
    });

    it('returns empty string for null', () => {
      expect(sanitise(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(sanitise(undefined)).toBe('');
    });

    it('returns empty string for a boolean', () => {
      expect(sanitise(true)).toBe('');
    });

    it('returns empty string for an object', () => {
      expect(sanitise({ foo: 'bar' })).toBe('');
    });

    it('returns empty string for an array', () => {
      expect(sanitise(['a', 'b'])).toBe('');
    });
  });

  // ── Basic passthrough ────────────────────────────────────────
  describe('basic passthrough', () => {
    it('returns empty string for an empty string', () => {
      expect(sanitise('')).toBe('');
    });

    it('returns plain text unchanged', () => {
      expect(sanitise('Hello, world!')).toBe('Hello, world!');
    });

    it('returns numeric string unchanged', () => {
      expect(sanitise('12345')).toBe('12345');
    });
  });

  // ── HTML tag neutralisation (angle-bracket removal) ──────────
  //
  // NOTE ON THE CONTRACT (updated after the CodeQL hardening):
  // `sanitise` does NOT remove whole tag spans (the old `/<[^>]*>/g`
  // approach). CodeQL flagged that as "incomplete multi-character
  // sanitization" because a reconstructing payload such as
  // `<scr<script>ipt>` survives a single pass. The implementation now
  // strips every `<` and `>` character and loops to a fixpoint, so no
  // tag can ever be formed or re-formed.
  //
  // The visible trade-off is that tag *names* survive as inert text:
  // '<b>bold</b>' -> 'bbold/b'. That is intentional. The security
  // invariant being defended is "no angle bracket survives", which each
  // test below asserts explicitly alongside the exact output.
  describe('HTML tag neutralisation (angle-bracket removal)', () => {
    const expectNoAngleBrackets = (result: string) => {
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    };

    it('neutralises a simple opening and closing tag pair, leaving inert text', () => {
      const result = sanitise('<b>bold</b>');
      expect(result).toBe('bbold/b');
      expectNoAngleBrackets(result);
    });

    it('neutralises a self-closing tag', () => {
      const result = sanitise('<br/>');
      expect(result).toBe('br/');
      expectNoAngleBrackets(result);
    });

    it('neutralises a tag with attributes and preserves the non-executable href text', () => {
      const result = sanitise('<a href="https://example.com">link</a>');
      expect(result).toBe('a href="https://example.com"link/a');
      expectNoAngleBrackets(result);
    });

    it('neutralises multiple different tags', () => {
      const result = sanitise('<p><strong>text</strong></p>');
      expect(result).toBe('pstrongtext/strong/p');
      expectNoAngleBrackets(result);
    });

    it('neutralises script tags so no executable element can form', () => {
      const result = sanitise('<script>alert(1)</script>');
      expect(result).toBe('scriptalert(1)/script');
      expectNoAngleBrackets(result);
      expect(result).not.toContain('<script');
    });

    it('neutralises img tags and strips the inline error handler', () => {
      const result = sanitise('<img src="x" onerror="alert(1)">');
      // `onerror=` is removed by the event-handler rule, leaving the bare value.
      expect(result).toBe('img src="x" "alert(1)"');
      expectNoAngleBrackets(result);
      expect(result).not.toMatch(/on\w+\s*=/i);
    });

    it('neutralises a tag with no content', () => {
      const result = sanitise('<div></div>');
      expect(result).toBe('div/div');
      expectNoAngleBrackets(result);
    });

    it('preserves text content between tags', () => {
      const result = sanitise('Hello <b>world</b>!');
      expect(result).toBe('Hello bworld/b!');
      expectNoAngleBrackets(result);
      expect(result).toContain('world');
    });
  });

  // ── Executable URI scheme stripping ─────────────────────────
  describe('executable URI scheme stripping', () => {
    it('strips javascript: scheme (lowercase)', () => {
      expect(sanitise('javascript:alert(1)')).toBe('alert(1)');
    });

    it('strips JavaScript: scheme (mixed case)', () => {
      expect(sanitise('JavaScript:alert(1)')).toBe('alert(1)');
    });

    it('strips JAVASCRIPT: scheme (uppercase)', () => {
      expect(sanitise('JAVASCRIPT:alert(1)')).toBe('alert(1)');
    });

    it('strips data: scheme', () => {
      // The scheme is removed and the angle brackets are stripped; the tag
      // name survives as inert text (see the tag-neutralisation notes above).
      const result = sanitise('data:text/html,<h1>XSS</h1>');
      expect(result).toBe('text/html,h1XSS/h1');
      expect(result).not.toContain('data:');
      expect(result).not.toContain('<');
    });

    it('strips data: scheme (case-insensitive)', () => {
      expect(sanitise('DATA:text/html,test')).toBe('text/html,test');
    });

    it('strips vbscript: scheme', () => {
      expect(sanitise('vbscript:MsgBox(1)')).toBe('MsgBox(1)');
    });

    it('strips vbscript: scheme (mixed case)', () => {
      expect(sanitise('VBScript:MsgBox(1)')).toBe('MsgBox(1)');
    });

    it('strips javascript: from href attribute value', () => {
      expect(sanitise('href="javascript:void(0)"')).toBe('href="void(0)"');
    });
  });

  // ── Inline event handler stripping ──────────────────────────
  describe('inline event handler stripping', () => {
    it('strips onclick=', () => {
      expect(sanitise('onclick=alert(1)')).toBe('alert(1)');
    });

    it('strips onmouseover=', () => {
      expect(sanitise('onmouseover=doSomething()')).toBe('doSomething()');
    });

    it('strips onerror=', () => {
      expect(sanitise('onerror=alert(1)')).toBe('alert(1)');
    });

    it('strips event handlers with spaces before =', () => {
      expect(sanitise('onclick   =alert(1)')).toBe('alert(1)');
    });

    it('strips event handlers case-insensitively', () => {
      expect(sanitise('ONCLICK=alert(1)')).toBe('alert(1)');
      expect(sanitise('OnClick=alert(1)')).toBe('alert(1)');
    });

    it('strips onload= handler', () => {
      expect(sanitise('onload=init()')).toBe('init()');
    });
  });

  // ── Null byte removal ────────────────────────────────────────
  describe('null byte removal', () => {
    it('removes a null byte embedded in a string', () => {
      // Null bytes are removed (deleted), not replaced by a space
      expect(sanitise('hello\0world')).toBe('helloworld');
    });

    it('removes multiple null bytes', () => {
      expect(sanitise('a\0b\0c')).toBe('abc');
    });

    it('removes a null byte at the start', () => {
      expect(sanitise('\0hello')).toBe('hello');
    });

    it('removes a null byte at the end', () => {
      expect(sanitise('hello\0')).toBe('hello');
    });
  });

  // ── Whitespace normalisation ─────────────────────────────────
  describe('whitespace normalisation', () => {
    it('collapses multiple spaces to a single space', () => {
      expect(sanitise('hello   world')).toBe('hello world');
    });

    it('collapses tabs and newlines to a single space', () => {
      expect(sanitise('hello\t\nworld')).toBe('hello world');
    });

    it('trims leading whitespace', () => {
      expect(sanitise('   hello')).toBe('hello');
    });

    it('trims trailing whitespace', () => {
      expect(sanitise('hello   ')).toBe('hello');
    });

    it('returns empty string for an all-whitespace input', () => {
      expect(sanitise('   \t\n   ')).toBe('');
    });
  });

  // ── maxLength truncation ─────────────────────────────────────
  describe('maxLength truncation', () => {
    it('truncates to default maxLength of 2000', () => {
      const long = 'a'.repeat(3000);
      expect(sanitise(long).length).toBe(2000);
    });

    it('does not truncate a string shorter than maxLength', () => {
      expect(sanitise('hello', 2000)).toBe('hello');
    });

    it('truncates to a custom maxLength', () => {
      expect(sanitise('hello world', 5)).toBe('hello');
    });

    it('returns empty string when maxLength is 0', () => {
      expect(sanitise('hello', 0)).toBe('');
    });

    it('preserves a string that is exactly maxLength characters', () => {
      const exact = 'a'.repeat(100);
      expect(sanitise(exact, 100)).toBe(exact);
    });

    it('truncates a string that is one character over maxLength', () => {
      const over = 'a'.repeat(101);
      expect(sanitise(over, 100).length).toBe(100);
    });
  });

  // ── Combined / multi-vector inputs ───────────────────────────
  describe('combined XSS vector inputs', () => {
    it('strips HTML tags and javascript: scheme together', () => {
      const input = '<a href="javascript:alert(1)">click</a>';
      const result = sanitise(input);
      expect(result).not.toContain('<a');
      expect(result).not.toContain('javascript:');
      expect(result).toContain('click');
    });

    it('strips event handler inside an HTML tag context', () => {
      const input = '<div onclick=alert(1)>content</div>';
      const result = sanitise(input);
      expect(result).not.toContain('<div');
      expect(result).not.toContain('onclick=');
    });

    it('handles a typical reflected XSS payload', () => {
      const payload = '<script>document.cookie</script>';
      const result = sanitise(payload);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('handles img-based XSS payload', () => {
      const payload = '<img src=x onerror=alert(1)>';
      const result = sanitise(payload);
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror=');
    });
  });

  // ── Iterative (fixpoint) behaviour ───────────────────────────
  // `sanitise` applies its replace chain inside a `do { ... } while (out !== prev)`
  // loop, so stripping repeats until the string stops changing. Combined with
  // removing every angle bracket, this is what closes the CodeQL
  // "incomplete multi-character sanitization" finding: a payload cannot
  // reconstruct a tag by hiding one inside another.
  describe('iterative (fixpoint) behaviour', () => {
    it('neutralises a straightforward nested structure', () => {
      const result = sanitise('<b><i>text</i></b>');
      expect(result).toBe('bitext/i/b');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('fully neutralises a tag-reconstructing payload (no leftover brackets)', () => {
      // '<scr<script>ipt>' is the classic reconstruction payload: a naive
      // single-pass `/<[^>]*>/g` removes the outer span and leaves fragments
      // that re-form '<script>'. Because every '<' and '>' is removed and the
      // loop runs to a fixpoint, nothing bracket-like can survive here.
      const input = '<scr<script>ipt>alert(1)</scr</script>ipt>';
      const result = sanitise(input);
      expect(result).toBe('scrscriptiptalert(1)/scr/scriptipt');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).not.toContain('<script');
    });

    it('re-strips a scheme that is only revealed after an earlier removal', () => {
      // 'javajavascript:script:' — removing the inner 'javascript:' re-forms
      // another 'javascript:', which only a fixpoint loop will catch.
      const result = sanitise('javajavascript:script:alert(1)');
      expect(result).toBe('alert(1)');
      expect(result.toLowerCase()).not.toContain('javascript:');
    });

    it('does not re-apply URI scheme removal after tag stripping', () => {
      // If a URI scheme is hidden inside a tag attribute it is stripped by tag removal.
      // But if a URI is directly in text, one pass is sufficient.
      const input = 'javascript:alert(1)';
      expect(sanitise(input)).toBe('alert(1)');
    });

    it('strips a javascript: scheme embedded in plain text after tag removal', () => {
      // After stripping tags the URI scheme in text is caught in the same pass.
      const input = '<b>javascript:alert(1)</b>';
      const result = sanitise(input);
      expect(result).not.toContain('javascript:');
    });
  });

  // ── Boundary / negative cases ────────────────────────────────
  describe('boundary and negative cases', () => {
    it('handles a string with unmatched angle bracket sequences', () => {
      // Every angle bracket is removed regardless of pairing, so an unmatched
      // run collapses to nothing. (The old `/<[^>]*>/g` left '>>' behind here —
      // exactly the kind of leftover that enabled tag reconstruction.)
      expect(sanitise('<<<>>>')).toBe('');
    });

    it('handles a string with only null bytes', () => {
      expect(sanitise('\0\0\0')).toBe('');
    });

    it('handles a very long string of spaces', () => {
      expect(sanitise(' '.repeat(5000))).toBe('');
    });

    it('handles unicode characters correctly', () => {
      expect(sanitise('héllo wörld')).toBe('héllo wörld');
    });

    it('handles emoji correctly', () => {
      expect(sanitise('hello 🎉')).toBe('hello 🎉');
    });

    it('does not alter a URL with https: scheme', () => {
      const url = 'https://example.com/path?q=1';
      expect(sanitise(url)).toBe(url);
    });

    it('does not strip mailto: scheme (not in the blocked list)', () => {
      const email = 'mailto:user@example.com';
      expect(sanitise(email)).toBe(email);
    });
  });
});
