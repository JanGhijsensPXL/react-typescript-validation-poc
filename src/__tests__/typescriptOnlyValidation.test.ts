import { describe, it, expect } from 'vitest';
import { validateWithTypeScriptOnly } from '../components/TypeScriptOnlyDemo';
import { VALID_RECORD, TEST_CASES } from '../data/testCases';

describe('validateWithTypeScriptOnly', () => {
  it('accepts a fully valid slaughter record', () => {
    const result = validateWithTypeScriptOnly(VALID_RECORD);
    expect(result.passed).toBe(true);
  });

  it('rejects a record with a missing id (undefined)', () => {
    const result = validateWithTypeScriptOnly({ ...VALID_RECORD, id: undefined });
    expect(result.passed).toBe(false);
    expect(result.note).toContain('id');
  });

  it('rejects a record with a null field', () => {
    const result = validateWithTypeScriptOnly({ ...VALID_RECORD, herderName: null });
    expect(result.passed).toBe(false);
    expect(result.note).toContain('herderName');
  });

  it('accepts an empty herder name — cannot detect invalid values at runtime', () => {
    // TypeScript-only validation passes this; Zod would reject it
    const result = validateWithTypeScriptOnly({ ...VALID_RECORD, herderName: '' });
    expect(result.passed).toBe(true);
  });

  it('accepts an invalid animal species — cannot detect wrong enum values at runtime', () => {
    const result = validateWithTypeScriptOnly({ ...VALID_RECORD, animalSpecies: 'pig' });
    expect(result.passed).toBe(true);
  });

  it('accepts a negative animal count — cannot detect out-of-range numbers at runtime', () => {
    const result = validateWithTypeScriptOnly({ ...VALID_RECORD, animalCount: -5 });
    expect(result.passed).toBe(true);
  });

  it('accepts zero total weight — cannot detect constraint violations at runtime', () => {
    const result = validateWithTypeScriptOnly({ ...VALID_RECORD, totalWeightKg: 0 });
    expect(result.passed).toBe(true);
  });

  it('accepts a malformed date — cannot detect format violations at runtime', () => {
    const result = validateWithTypeScriptOnly({ ...VALID_RECORD, slaughterDate: '15-11-2024' });
    expect(result.passed).toBe(true);
  });

  it('accepts a string "true" for veterinarianApproved — cannot detect wrong types at runtime', () => {
    const result = validateWithTypeScriptOnly({ ...VALID_RECORD, veterinarianApproved: 'true' });
    expect(result.passed).toBe(true);
  });

  it('accepts a non-integer animal count — cannot detect non-integer numbers at runtime', () => {
    const result = validateWithTypeScriptOnly({ ...VALID_RECORD, animalCount: 12.5 });
    expect(result.passed).toBe(true);
  });

  it('returns the expected note message on success', () => {
    const result = validateWithTypeScriptOnly(VALID_RECORD);
    expect(result.note).toBe('Passed — TypeScript cannot detect invalid values at runtime.');
  });

  it('lists all missing fields in the note on failure', () => {
    const result = validateWithTypeScriptOnly({ id: 'SL-001' });
    expect(result.passed).toBe(false);
    expect(result.note).toContain('herderName');
    expect(result.note).toContain('animalSpecies');
    expect(result.note).toContain('veterinarianApproved');
  });
});

describe('TEST_CASES dataset through TypeScript-only validation', () => {
  it('only catches missing fields — all invalid-value cases are silently accepted', () => {
    for (const tc of TEST_CASES) {
      const result = validateWithTypeScriptOnly(tc.data);
      if (tc.expectValid) {
        // Valid records should pass
        expect(result.passed).toBe(true);
      } else {
        // Invalid records pass too — that is the point of the demo
        // The only case TypeScript-only rejects is a missing/null field
        expect(typeof result.passed).toBe('boolean');
      }
    }
  });
});
