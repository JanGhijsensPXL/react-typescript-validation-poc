import {
  as,
  cascade,
  hasMaxLength,
  hasMinLength,
  isAtLeast,
  isAtMost,
  isEnum,
  isInteger,
  isNumber,
  isObject,
  isString,
  makeValidator,
  matchesRegExp,
} from 'typanion';

const isValidCalendarDate = makeValidator<string, string>({
  test: (value, state) => {
    if (!Number.isNaN(Date.parse(value))) {
      return true;
    }

    // Always use state?.p if available; it contains the field path
    // Ensure we have a path: state?.p is like "slaughterDate", "root.slaughterDate", or undefined
    const path = state?.p?.toString() ?? 'slaughterDate';
    state?.errors?.push(`${path}: Date must be a valid calendar date`);
    return false;
  },
});

const isStrictlyPositiveNumber = makeValidator<number, number>({
  test: (value, state) => {
    if (value > 0) {
      return true;
    }

    const path = state?.p?.toString() ?? 'totalWeightKg';
    state?.errors?.push(`${path}: Value must be greater than 0`);
    return false;
  },
});

export const slaughterRecordTypanionSchema = isObject({
  id: cascade(isString(), hasMinLength(1)),
  herderName: cascade(isString(), hasMinLength(2), hasMaxLength(100)),
  animalSpecies: isEnum(['reindeer', 'elk', 'moose']),
  slaughterDate: cascade(
    isString(),
    matchesRegExp(/^\d{4}-\d{2}-\d{2}$/),
    isValidCalendarDate,
  ),
  animalCount: cascade(isNumber(), isInteger(), isAtLeast(1), isAtMost(10000)),
  totalWeightKg: cascade(isNumber(), isStrictlyPositiveNumber, isAtMost(1_000_000)),
  slaughterhouseId: cascade(isString(), hasMinLength(1)),
  veterinarianApproved: isEnum([true, false]),
});

export function validateWithTypanion(data: unknown): {
  passed: boolean;
  errors: string[];
} {
  const result = as(data, slaughterRecordTypanionSchema, {
    errors: true,
    throw: false,
  });

  if (!result.errors || result.errors.length === 0) {
    return { passed: true, errors: [] };
  }

  // Typanion's error collection may not include field paths for all validators.
  // Re-format error messages to include field names for better diagnostics.
  const enhancedErrors: string[] = [];

  // Process captured errors
  for (const err of result.errors) {
    const errStr = String(err);
    
    // If error already includes a known field name with colon, keep it
    const colonIdx = errStr.indexOf(':');
    if (colonIdx > 0) {
      const potentialField = errStr.substring(0, colonIdx).trim();
      // Accept if it looks like a field name (not generic placeholders)
      const knownFields = ['id', 'herderName', 'animalSpecies', 'slaughterDate', 'animalCount', 'totalWeightKg', 'slaughterhouseId', 'veterinarianApproved'];
      if (knownFields.includes(potentialField)) {
        enhancedErrors.push(errStr);
        continue;
      }
    }
    
    // For remaining errors without clear field attribution, infer from message content
    let fieldName = '';
    if (errStr.toLowerCase().includes('date')) fieldName = 'slaughterDate';
    else if (errStr.toLowerCase().includes('count')) fieldName = 'animalCount';
    else if (errStr.toLowerCase().includes('weight')) fieldName = 'totalWeightKg';
    else if (errStr.toLowerCase().includes('species')) fieldName = 'animalSpecies';
    else if (errStr.toLowerCase().includes('herder')) fieldName = 'herderName';
    else if (errStr.toLowerCase().includes('slaughterhouse')) fieldName = 'slaughterhouseId';
    else if (errStr.toLowerCase().includes('veterinarian') || errStr.toLowerCase().includes('approval')) fieldName = 'veterinarianApproved';
    else if (errStr.toLowerCase().includes('id')) fieldName = 'id';
    
    if (fieldName) {
      enhancedErrors.push(`${fieldName}: ${errStr}`);
    } else {
      enhancedErrors.push(errStr);
    }
  }

  return {
    passed: false,
    errors: enhancedErrors,
  };
}
