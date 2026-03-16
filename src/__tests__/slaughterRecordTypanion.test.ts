import { describe, expect, it } from 'vitest';
import { TEST_CASES, VALID_RECORD } from '../data/testCases';
import {
  slaughterRecordTypanionSchema,
  validateWithTypanion,
} from '../schemas/slaughterRecordTypanion';

describe('slaughterRecordTypanionSchema', () => {
  it('accepts a fully valid slaughter record', () => {
    const result = validateWithTypanion(VALID_RECORD);
    expect(result.passed).toBe(true);
  });

  it('rejects invalid calendar date values', () => {
    const result = validateWithTypanion({
      ...VALID_RECORD,
      slaughterDate: '2024-13-99',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects malformed date format values', () => {
    const result = validateWithTypanion({
      ...VALID_RECORD,
      slaughterDate: '15-11-2024',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects records with unknown extra fields', () => {
    const isValid = slaughterRecordTypanionSchema({
      ...VALID_RECORD,
      extraField: 'unexpected',
    });
    expect(isValid).toBe(false);
  });
});

describe('TEST_CASES dataset through Typanion validation', () => {
  it('matches expected validity for all shared test cases', () => {
    for (const tc of TEST_CASES) {
      const result = validateWithTypanion(tc.data);
      if (result.passed !== tc.expectValid) {
        throw new Error(
          `Mismatch for "${tc.label}": expected ${tc.expectValid}, got ${result.passed}. Errors: ${result.errors.join(' | ')}`,
        );
      }
    }
  });
});
