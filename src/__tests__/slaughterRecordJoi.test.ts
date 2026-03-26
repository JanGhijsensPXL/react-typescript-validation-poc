import { describe, expect, it } from 'vitest';
import { TEST_CASES, VALID_RECORD } from '../data/testCases';
import { slaughterRecordJoiSchema, validateWithJoi } from '../schemas/slaughterRecordJoi';

describe('slaughterRecordJoiSchema', () => {
  it('accepts a fully valid slaughter record', () => {
    const result = validateWithJoi(VALID_RECORD);
    expect(result.passed).toBe(true);
  });

  it('rejects invalid calendar date values', () => {
    const result = validateWithJoi({
      ...VALID_RECORD,
      slaughterDate: '2024-13-99',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects malformed date format values', () => {
    const result = validateWithJoi({
      ...VALID_RECORD,
      slaughterDate: '15-11-2024',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects slaughter dates in the future', () => {
    const result = validateWithJoi({
      ...VALID_RECORD,
      slaughterDate: '2099-01-01',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects IDs that do not match ear-tag format', () => {
    const result = validateWithJoi({
      ...VALID_RECORD,
      id: 'TAG-24-A7',
    });
    expect(result.passed).toBe(false);
  });

  it('rejects records with unknown extra fields', () => {
    const { error } = slaughterRecordJoiSchema.validate(
      { ...VALID_RECORD, extraField: 'unexpected' },
      { convert: false },
    );
    expect(error).toBeDefined();
  });

  it('rejects non-integer animal counts', () => {
    const result = validateWithJoi({
      ...VALID_RECORD,
      animalCount: 12.5,
    });
    expect(result.passed).toBe(false);
  });
});

describe('TEST_CASES dataset through Joi validation', () => {
  it('matches expected validity for all shared test cases', () => {
    for (const tc of TEST_CASES) {
      const result = validateWithJoi(tc.data);
      expect(result.passed).toBe(tc.expectValid);
    }
  });
});
