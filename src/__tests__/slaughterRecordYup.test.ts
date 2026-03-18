import { describe, expect, it } from 'vitest';
import { TEST_CASES, VALID_RECORD } from '../data/testCases';
import { slaughterRecordYupSchema, validateWithYup } from '../schemas/slaughterRecordYup';

describe('slaughterRecordYupSchema', () => {
  it('accepts a fully valid slaughter record', () => {
    const result = validateWithYup(VALID_RECORD);
    expect(result.passed).toBe(true);
  });

  it('rejects invalid calendar date values', () => {
    const result = validateWithYup({
      ...VALID_RECORD,
      slaughterDate: '2024-13-99',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects malformed date format values', () => {
    const result = validateWithYup({
      ...VALID_RECORD,
      slaughterDate: '15-11-2024',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects records with unknown extra fields', () => {
    const result = validateWithYup({
      ...VALID_RECORD,
      extraField: 'unexpected',
    });
    expect(result.passed).toBe(false);
  });

  it('can validate synchronously via schema API', () => {
    const isValid = slaughterRecordYupSchema.isValidSync(VALID_RECORD, { strict: true });
    expect(isValid).toBe(true);
  });
});

describe('TEST_CASES dataset through Yup validation', () => {
  it('matches expected validity for all shared test cases', () => {
    for (const tc of TEST_CASES) {
      const result = validateWithYup(tc.data);
      expect(result.passed).toBe(tc.expectValid);
    }
  });
});
