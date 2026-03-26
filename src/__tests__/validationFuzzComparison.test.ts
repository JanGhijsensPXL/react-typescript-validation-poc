import { describe, expect, it } from 'vitest';
import { validateWithTypeScriptOnly } from '../components/TypeScriptOnlyDemo';
import { slaughterRecordSchema } from '../schemas/slaughterRecordZod';
import { validateWithSuperstruct } from '../schemas/slaughterRecordSuperstruct';
import { validateWithTypanion } from '../schemas/slaughterRecordTypanion';
import { validateWithYup } from '../schemas/slaughterRecordYup';
import { validateWithAjv } from '../schemas/slaughterRecordAjv';
import { validateWithJoi } from '../schemas/slaughterRecordJoi';
import { VALID_RECORD } from '../data/testCases';

type GeneratedCase = {
  input: unknown;
  expectedValid: boolean;
};

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function mutateInvalid(base: typeof VALID_RECORD, index: number, includeUnknownField = false): unknown {
  const modBase = includeUnknownField ? 11 : 10;
  const mod = index % modBase;
  if (mod === 0) return { ...base, id: '' };
  if (mod === 1) return { ...base, herderName: '' };
  if (mod === 2) return { ...base, type: 'unknown' };
  if (mod === 3) return { ...base, slaughterDate: '15-11-2024' };
  if (mod === 4) return { ...base, slaughterDate: '2024-13-99' };
  if (mod === 5) return { ...base, animalCount: -1 };
  if (mod === 6) return { ...base, totalWeightKg: 0 };
  if (mod === 7) return { ...base, veterinarianApproved: 'true' };
  if (mod === 8) return { ...base, slaughterhouseId: '' };
  if (mod === 9) return { ...base, animalCount: 12.5 };
  return includeUnknownField
    ? { ...base, extraField: 'unexpected' }
    : { ...base, herderName: '' };
}

function mutateValid(base: typeof VALID_RECORD, index: number): typeof VALID_RECORD {
  return {
    ...base,
    id: `SL-2024-${String(index + 1).padStart(6, '0')}`,
    herderName: `Herder ${index + 1}`,
    type: (['male', 'female', 'child', 'steralised male'] as const)[index % 4],
    slaughterDate: `2024-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
    animalCount: (index % 300) + 1,
    totalWeightKg: (index % 5000) + 1,
    veterinarianApproved: index % 2 === 0,
  };
}

function generateCases(
  total: number,
  invalidRate: number,
  seed: number,
  includeUnknownField = false,
): GeneratedCase[] {
  const rand = createSeededRandom(seed);
  return Array.from({ length: total }, (_, i) => {
    const isInvalid = rand() < invalidRate;
    return {
      input: isInvalid
        ? mutateInvalid(VALID_RECORD, i, includeUnknownField)
        : mutateValid(VALID_RECORD, i),
      expectedValid: !isInvalid,
    };
  });
}

function computeMismatchCount(
  cases: GeneratedCase[],
  validate: (input: unknown) => boolean,
): { mismatches: number; falseAccepts: number; falseRejects: number } {
  let mismatches = 0;
  let falseAccepts = 0;
  let falseRejects = 0;

  for (const c of cases) {
    const predictedValid = validate(c.input);
    if (predictedValid !== c.expectedValid) {
      mismatches += 1;
      if (predictedValid && !c.expectedValid) {
        falseAccepts += 1;
      }
      if (!predictedValid && c.expectedValid) {
        falseRejects += 1;
      }
    }
  }

  return { mismatches, falseAccepts, falseRejects };
}

describe('fuzz comparison across validators', () => {
  it('shows runtime validators stay accurate on randomized mixed payloads', () => {
    const cases = generateCases(1200, 0.35, 20260317, false);

    const zod = computeMismatchCount(cases, (input) => slaughterRecordSchema.safeParse(input).success);
    const superstruct = computeMismatchCount(cases, (input) => validateWithSuperstruct(input).passed);
    const yup = computeMismatchCount(cases, (input) => validateWithYup(input).passed);
    const typanion = computeMismatchCount(cases, (input) => validateWithTypanion(input).passed);
    const ajv = computeMismatchCount(cases, (input) => validateWithAjv(input).passed);
    const joi = computeMismatchCount(cases, (input) => validateWithJoi(input).passed);
    const typeScriptOnly = computeMismatchCount(cases, (input) => validateWithTypeScriptOnly(input).passed);

    expect(zod.mismatches).toBe(0);
    expect(superstruct.mismatches).toBe(0);
    expect(yup.mismatches).toBe(0);
    expect(typanion.mismatches).toBe(0);
    expect(ajv.mismatches).toBe(0);
    expect(joi.mismatches).toBe(0);

    // TypeScript-only validation should miss invalid values in mixed random payloads.
    expect(typeScriptOnly.falseAccepts).toBeGreaterThan(0);
    expect(typeScriptOnly.mismatches).toBeGreaterThan(0);
    expect(typeScriptOnly.falseRejects).toBe(0);
  });

  it('reveals strict-boundary differences for unknown fields', () => {
    const cases = Array.from({ length: 300 }, (_, i) => ({
      input: { ...mutateValid(VALID_RECORD, i), extraField: `extra-${i}` },
      expectedValid: false,
    }));

    const zod = computeMismatchCount(cases, (input) => slaughterRecordSchema.safeParse(input).success);
    const superstruct = computeMismatchCount(cases, (input) => validateWithSuperstruct(input).passed);
    const yup = computeMismatchCount(cases, (input) => validateWithYup(input).passed);
    const typanion = computeMismatchCount(cases, (input) => validateWithTypanion(input).passed);
    const ajv = computeMismatchCount(cases, (input) => validateWithAjv(input).passed);
    const joi = computeMismatchCount(cases, (input) => validateWithJoi(input).passed);

    // All runtime validators are strict on extra keys in the current setup.
    expect(zod.falseAccepts).toBe(0);
    expect(superstruct.falseAccepts).toBe(0);
    expect(yup.falseAccepts).toBe(0);
    expect(typanion.falseAccepts).toBe(0);
    expect(ajv.falseAccepts).toBe(0);
    expect(joi.falseAccepts).toBe(0);
  });

  it('catches domain-specific invalid submissions beyond random fuzz inputs', () => {
    const domainCases: GeneratedCase[] = [
      {
        input: { ...VALID_RECORD, totalWeightKg: 0 },
        expectedValid: false,
      },
      {
        input: { ...VALID_RECORD, animalCount: -2 },
        expectedValid: false,
      },
      {
        input: { ...VALID_RECORD, slaughterDate: '2099-01-01' },
        expectedValid: false,
      },
      {
        input: { ...VALID_RECORD, id: 'TAG-24-A7' },
        expectedValid: false,
      },
    ];

    const zod = computeMismatchCount(domainCases, (input) => slaughterRecordSchema.safeParse(input).success);
    const superstruct = computeMismatchCount(domainCases, (input) => validateWithSuperstruct(input).passed);
    const yup = computeMismatchCount(domainCases, (input) => validateWithYup(input).passed);
    const typanion = computeMismatchCount(domainCases, (input) => validateWithTypanion(input).passed);
    const ajv = computeMismatchCount(domainCases, (input) => validateWithAjv(input).passed);
    const joi = computeMismatchCount(domainCases, (input) => validateWithJoi(input).passed);
    const typeScriptOnly = computeMismatchCount(domainCases, (input) => validateWithTypeScriptOnly(input).passed);

    expect(zod.falseAccepts).toBe(0);
    expect(superstruct.falseAccepts).toBe(0);
    expect(yup.falseAccepts).toBe(0);
    expect(typanion.falseAccepts).toBe(0);
    expect(ajv.falseAccepts).toBe(0);
    expect(joi.falseAccepts).toBe(0);

    // Compile-time-only baseline still accepts all complete-but-invalid domain payloads.
    expect(typeScriptOnly.falseAccepts).toBe(domainCases.length);
    expect(typeScriptOnly.falseRejects).toBe(0);
  });
});
