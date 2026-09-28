/**
 * test/rbac/cel-evaluator.spec.ts
 *
 * Executed for real in the delivery sandbox via a local Jest-compatible
 * shim over node:test (no network access to install Jest itself — see
 * MANIFEST.md → "How these tests were actually run"). Written in plain
 * Jest syntax so it runs unmodified against real Jest in the target repo.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { CelEvaluatorService } from '../../src/modules/rbac/services/cel-evaluator.service';
import {
  CelParseError,
  CelTimeoutError,
  CelEvaluationError,
  CelForbiddenPropertyError,
} from '../../src/modules/rbac/errors/rbac.errors';

describe('CelEvaluatorService', () => {
  let cel: CelEvaluatorService;

  beforeEach(() => {
    cel = new CelEvaluatorService();
  });

  describe('literals and arithmetic', () => {
    it('evaluates numeric literals and arithmetic', () => {
      expect(cel.evaluate('1 + 2', {})).toBe(3);
      expect(cel.evaluate('10 - 4 * 2', {})).toBe(2); // precedence
      expect(cel.evaluate('(10 - 4) * 2', {})).toBe(12); // grouping
      expect(cel.evaluate('7 % 3', {})).toBe(1);
      expect(cel.evaluate('9 / 2', {})).toBe(4.5);
    });

    it('concatenates strings with +', () => {
      expect(cel.evaluate('"foo" + "bar"', {})).toBe('foobar');
    });

    it('throws on division and modulo by zero', () => {
      expect(() => cel.evaluate('1 / 0', {})).toThrow('division by zero');
      expect(() => cel.evaluate('1 % 0', {})).toThrow('modulo by zero');
    });
  });

  describe('the prompt\'s own example rule', () => {
    it('evaluates "amount > 10000 && user.role == \'manager\'" both ways', () => {
      const expr = "amount > 10000 && user.role == 'manager'";
      expect(cel.evaluateBoolean(expr, { amount: 15000, user: { role: 'manager' } })).toBe(true);
      expect(cel.evaluateBoolean(expr, { amount: 5000, user: { role: 'manager' } })).toBe(false);
      expect(cel.evaluateBoolean(expr, { amount: 15000, user: { role: 'clerk' } })).toBe(false);
    });
  });

  describe('boolean operators are strict', () => {
    it('supports && / || / ! on real booleans', () => {
      expect(cel.evaluate('true && false', {})).toBe(false);
      expect(cel.evaluate('true || false', {})).toBe(true);
      expect(cel.evaluate('!true', {})).toBe(false);
    });

    it('short-circuits && and ||', () => {
      // right side references an undefined var; if && didn't short-circuit
      // on a false left side this would throw instead of returning false.
      expect(cel.evaluate('false && undefined_var.deep.path', {})).toBe(false);
      expect(cel.evaluate('true || undefined_var.deep.path', {})).toBe(true);
    });

    it('rejects non-boolean operands to && / || / !, unlike JS truthiness', () => {
      expect(() => cel.evaluate('1 && true', {})).toThrow(CelEvaluationError);
      expect(() => cel.evaluate('!1', {})).toThrow(CelEvaluationError);
    });
  });

  describe('member access', () => {
    it('reads nested properties', () => {
      expect(cel.evaluate('user.profile.department', { user: { profile: { department: 'sales' } } })).toBe('sales');
    });

    it('returns undefined for a missing property rather than throwing', () => {
      expect(cel.evaluate('user.nickname', { user: {} })).toBeUndefined();
    });

    it('treats a missing field as equal to null (documented subset behavior)', () => {
      expect(cel.evaluate('user.nickname == null', { user: {} })).toBe(true);
    });
  });

  describe('the `in` operator', () => {
    it('checks list membership', () => {
      expect(cel.evaluate("user.role in ['manager', 'director']", { user: { role: 'director' } })).toBe(true);
      expect(cel.evaluate("user.role in ['manager', 'director']", { user: { role: 'clerk' } })).toBe(false);
    });

    it('checks object key membership', () => {
      expect(cel.evaluate("'a' in flags", { flags: { a: true } })).toBe(true);
      expect(cel.evaluate("'z' in flags", { flags: { a: true } })).toBe(false);
    });
  });

  describe('compiled expressions are cached and reusable', () => {
    it('evaluates the same compiled expression against different contexts', () => {
      const compiled = cel.compile('amount > threshold');
      expect(compiled.evaluateBoolean({ amount: 100, threshold: 50 })).toBe(true);
      expect(compiled.evaluateBoolean({ amount: 10, threshold: 50 })).toBe(false);
    });
  });

  describe('validate()', () => {
    it('reports valid for well-formed expressions without evaluating them', () => {
      expect(cel.validate("amount > 10000 && user.role == 'manager'")).toEqual({ valid: true });
    });

    it('reports invalid with a message for malformed expressions', () => {
      const result = cel.validate('amount > ');
      expect(result.valid).toBe(false);
    });
  });

  describe('resource limits', () => {
    it('rejects expressions longer than the configured max length', () => {
      const huge = Array.from({ length: 3000 }, () => '1').join('+');
      expect(() => cel.evaluate(huge, {})).toThrow(CelParseError);
    });

    it('rejects pathologically deep nesting instead of stack-overflowing', () => {
      const deep = '('.repeat(500) + '1' + ')'.repeat(500);
      expect(() => cel.evaluate(deep, {})).toThrow(CelParseError);
    });

    it('enforces a timeout budget for evaluation', () => {
      // A deliberately-already-past deadline (-1000ms), not 0ms: Date.now()
      // only has ~1ms resolution, and evaluating `1 + 1` takes microseconds,
      // so a 0ms budget isn't reliably guaranteed to have "expired" by the
      // time the check runs on every machine/run — this would be flaky.
      // -1000ms removes that ambiguity entirely. In production the default
      // is 50ms (CEL_EVAL_TIMEOUT_MS), ~50x this resolution, so the
      // resolution question never matters at the real operating point.
      expect(() => cel.evaluate('1 + 1', {}, -1000)).toThrow(CelTimeoutError);
    });
  });

  describe('sandbox escape / injection attempts — all must be inert', () => {
    it('refuses to resolve __proto__', () => {
      expect(() => cel.evaluate('user.__proto__', { user: {} })).toThrow(CelForbiddenPropertyError);
    });

    it('refuses to resolve constructor', () => {
      expect(() => cel.evaluate('user.constructor', { user: {} })).toThrow(CelForbiddenPropertyError);
    });

    it('refuses to resolve prototype', () => {
      expect(() => cel.evaluate('user.prototype', { user: {} })).toThrow(CelForbiddenPropertyError);
    });

    it('has no call syntax, so a JS-call-style payload is just a parse error', () => {
      // No function-call grammar exists at all, so this can only ever be
      // a syntax error — never a path to executing anything.
      expect(() => cel.evaluate("user.constructor.constructor('return process')()", { user: {} }))
        .toThrow(CelParseError);
    });

    it('has no assignment operator, so attempted prototype pollution is a parse error', () => {
      expect(() => cel.evaluate("user.__proto__.polluted = true", { user: {} })).toThrow();
    });

    it('treats a SQL-injection-shaped string as an inert string literal', () => {
      // This evaluator never touches a database or shell — a malicious
      // string is just data being compared, same as any other string.
      const payload = "'; DROP TABLE users; --";
      expect(cel.evaluate('input == payload', { input: payload, payload })).toBe(true);
      expect(cel.evaluate(`input == "${payload.replace(/"/g, '\\"')}"`, { input: payload })).toBe(true);
    });

    it('reads only real own properties, never inherited/prototype ones', () => {
      // "length" on a plain object is a normal own-data field.
      expect(cel.evaluate('items.length', { items: { length: 3 } })).toBe(3);
      // "length" on a real array IS a genuine own property too (JS arrays
      // carry it directly on the instance, not on Array.prototype) — 3 is
      // the correct, safe answer here, not a leak.
      expect(cel.evaluate('items.length', { items: [1, 2, 3] })).toBe(3);
      // "hasOwnProperty" is inherited from Object.prototype, not an own
      // property of this plain data object, so it correctly resolves to
      // undefined instead of leaking the real Object.prototype method.
      expect(cel.evaluate('record.hasOwnProperty', { record: { amount: 3 } })).toBeUndefined();
    });
  });

  describe('type errors are explicit rather than silently coerced', () => {
    it('rejects comparing a number to a string', () => {
      expect(() => cel.evaluate('1 < "2"', {})).toThrow(CelEvaluationError);
    });

    it('rejects arithmetic on non-numbers', () => {
      expect(() => cel.evaluate('true + 1', {})).toThrow(CelEvaluationError);
    });
  });
});
