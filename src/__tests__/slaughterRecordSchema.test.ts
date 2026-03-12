import { describe, it, expect } from 'vitest';
import { slaughterRecordSchema } from '../schemas/slaughterRecordSchema';
import { VALID_RECORD, TEST_CASES } from '../data/testCases';

describe('slaughterRecordSchema', () => {
  it('accepts a fully valid slaughter record', () => {
    const result = slaughterRecordSchema.safeParse(VALID_RECORD);
    expect(result.success).toBe(true);
  });

  it('rejects an empty herder name', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, herderName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects herder name shorter than 2 characters', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, herderName: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid animal species', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, animalSpecies: 'pig' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid species values', () => {
    for (const species of ['reindeer', 'elk', 'moose'] as const) {
      const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, animalSpecies: species });
      expect(result.success).toBe(true);
    }
  });

  it('rejects a negative animal count', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, animalCount: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects a zero animal count', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, animalCount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer animal count', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, animalCount: 12.5 });
    expect(result.success).toBe(false);
  });

  it('rejects zero total weight', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, totalWeightKg: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects a negative total weight', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, totalWeightKg: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed slaughter date (wrong format)', () => {
    const result = slaughterRecordSchema.safeParse({
      ...VALID_RECORD,
      slaughterDate: '15-11-2024',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid calendar date', () => {
    const result = slaughterRecordSchema.safeParse({
      ...VALID_RECORD,
      slaughterDate: '2024-13-99',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a string "true" where a boolean is expected', () => {
    const result = slaughterRecordSchema.safeParse({
      ...VALID_RECORD,
      veterinarianApproved: 'true',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing slaughterhouse ID', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, slaughterhouseId: '' });
    expect(result.success).toBe(false);
  });

  it('returns the parsed record on success', () => {
    const result = slaughterRecordSchema.safeParse(VALID_RECORD);
    if (result.success) {
      expect(result.data.herderName).toBe('Aslak Eira');
      expect(result.data.animalCount).toBe(45);
    }
  });

  it('provides error messages describing which field failed', () => {
    const result = slaughterRecordSchema.safeParse({ ...VALID_RECORD, animalCount: -1 });
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('animalCount');
    }
  });
});

describe('TEST_CASES dataset', () => {
  it('validates all test cases against the schema as expected', () => {
    for (const tc of TEST_CASES) {
      const result = slaughterRecordSchema.safeParse(tc.data);
      expect(result.success).toBe(tc.expectValid);
    }
  });
});
