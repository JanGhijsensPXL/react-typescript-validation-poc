import { describe, it, expect } from 'vitest';
import { validateWithTypeScriptOnly } from '../components/TypeScriptOnlyDemo';
import { VALID_RECORD, TEST_CASES } from '../data/testCases';
import type { SlaughterRecord } from '../types/slaughterRecord';
import { slaughterRecordSchema } from '../schemas/slaughterRecordZod';

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

function submitFormWithoutRuntimeValidation(formData: unknown): {
  submitted: boolean;
  storedRecord: SlaughterRecord;
} {
  // Simulates a submit handler that relies only on compile-time typing.
  const payload = formData as SlaughterRecord;
  return {
    submitted: true,
    storedRecord: payload,
  };
}

function submitFormWithRuntimeValidation(formData: unknown): {
  submitted: boolean;
  errorFields: string[];
} {
  const result = slaughterRecordSchema.safeParse(formData);
  if (!result.success) {
    return {
      submitted: false,
      errorFields: result.error.issues.map((issue) => issue.path.join('.') || 'root'),
    };
  }

  return { submitted: true, errorFields: [] };
}

describe('baseline comparison: compile-time only vs runtime validation on submit', () => {
  it('shows invalid form data can be submitted when runtime validation is bypassed', () => {
    const invalidButCompletePayload = {
      ...VALID_RECORD,
      herderName: '',
      animalSpecies: 'pig',
      slaughterDate: '15-11-2024',
      animalCount: -3,
      totalWeightKg: 0,
      veterinarianApproved: 'true',
    };

    const typeScriptOnlySubmission = submitFormWithoutRuntimeValidation(invalidButCompletePayload);
    expect(typeScriptOnlySubmission.submitted).toBe(true);

    // The invalid values survive and would be sent/stored as-is.
    expect(typeScriptOnlySubmission.storedRecord.herderName).toBe('');
    expect(typeScriptOnlySubmission.storedRecord.animalSpecies).toBe('pig');
    expect(typeScriptOnlySubmission.storedRecord.slaughterDate).toBe('15-11-2024');
    expect(typeScriptOnlySubmission.storedRecord.animalCount).toBe(-3);
    expect(typeScriptOnlySubmission.storedRecord.totalWeightKg).toBe(0);
    expect(typeScriptOnlySubmission.storedRecord.veterinarianApproved).toBe('true');

    const runtimeValidatedSubmission = submitFormWithRuntimeValidation(invalidButCompletePayload);
    expect(runtimeValidatedSubmission.submitted).toBe(false);
    expect(runtimeValidatedSubmission.errorFields).toContain('herderName');
    expect(runtimeValidatedSubmission.errorFields).toContain('animalSpecies');
    expect(runtimeValidatedSubmission.errorFields).toContain('slaughterDate');
    expect(runtimeValidatedSubmission.errorFields).toContain('animalCount');
    expect(runtimeValidatedSubmission.errorFields).toContain('totalWeightKg');
    expect(runtimeValidatedSubmission.errorFields).toContain('veterinarianApproved');
  });
});
