import { describe, expect, it } from 'vitest';
import { TEST_CASES, VALID_RECORD } from '../data/testCases';
import {
  slaughterRecordSuperstructSchema,
  validateWithSuperstruct,
} from '../schemas/slaughterRecordSuperstruct';

describe('slaughterRecordSuperstructSchema', () => {
  it('accepts a fully valid slaughter record', () => {
    const result = validateWithSuperstruct(VALID_RECORD);
    expect(result.passed).toBe(true);
  });

  it('rejects invalid calendar date values', () => {
    const result = validateWithSuperstruct({
      ...VALID_RECORD,
      slaughterDate: '2024-13-99',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects malformed date format values', () => {
    const result = validateWithSuperstruct({
      ...VALID_RECORD,
      slaughterDate: '15-11-2024',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects records with unknown extra fields', () => {
    const result = slaughterRecordSuperstructSchema.is({
      ...VALID_RECORD,
      extraField: 'unexpected',
    });
    expect(result).toBe(false);
  });
});

describe('TEST_CASES dataset through Superstruct validation', () => {
  it('matches expected validity for all shared test cases', () => {
    for (const tc of TEST_CASES) {
      const result = validateWithSuperstruct(tc.data);
      expect(result.passed).toBe(tc.expectValid);
    }
  });
});
