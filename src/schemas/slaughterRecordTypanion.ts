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

const EAR_TAG_ID_PATTERN = /^SL-\d{4}-\d{3,6}$/;

const isValidCalendarDate = makeValidator<string, string>({
  test: (value, state) => {
    if (!Number.isNaN(Date.parse(value))) {
      return true;
    }

    state?.errors?.push(`${state?.p ?? 'value'}: Date must be a valid calendar date`);
    return false;
  },
});

const isNotFutureDate = makeValidator<string, string>({
  test: (value, state) => {
    const date = new Date(`${value}T00:00:00Z`);
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

    if (date.getTime() <= todayUtc) {
      return true;
    }

    state?.errors?.push(`${state?.p ?? 'value'}: Date cannot be in the future`);
    return false;
  },
});

const isStrictlyPositiveNumber = makeValidator<number, number>({
  test: (value, state) => {
    if (value > 0) {
      return true;
    }

    state?.errors?.push(`${state?.p ?? 'value'}: Value must be greater than 0`);
    return false;
  },
});

export const slaughterRecordTypanionSchema = isObject({
  id: cascade(isString(), matchesRegExp(EAR_TAG_ID_PATTERN)),
  herderName: cascade(isString(), hasMinLength(2), hasMaxLength(100)),
  animalSpecies: isEnum(['reindeer', 'elk', 'moose']),
  slaughterDate: cascade(
    isString(),
    matchesRegExp(/^\d{4}-\d{2}-\d{2}$/),
    isValidCalendarDate,
    isNotFutureDate,
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

  if (!result.errors) {
    return { passed: true, errors: [] };
  }

  return {
    passed: false,
    errors: result.errors,
  };
}
