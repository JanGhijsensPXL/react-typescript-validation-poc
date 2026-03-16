import {
  boolean,
  enums,
  integer,
  max,
  min,
  number,
  object,
  pattern,
  refine,
  size,
  string,
  validate,
} from 'superstruct';

const isoDateString = refine(
  pattern(size(string(), 10, 10), /^\d{4}-\d{2}-\d{2}$/),
  'validDate',
  (value) => !Number.isNaN(Date.parse(value)) || 'Date must be a valid calendar date',
);

export const slaughterRecordSuperstructSchema = object({
  id: size(string(), 1, Infinity),
  herderName: size(string(), 2, 100),
  animalSpecies: enums(['reindeer', 'elk', 'moose']),
  slaughterDate: isoDateString,
  animalCount: max(min(integer(), 1), 10000),
  totalWeightKg: max(min(number(), 0, { exclusive: true }), 1_000_000),
  slaughterhouseId: size(string(), 1, Infinity),
  veterinarianApproved: boolean(),
});

export function validateWithSuperstruct(data: unknown): {
  passed: boolean;
  errors: string[];
} {
  const [error] = validate(data, slaughterRecordSuperstructSchema);
  if (!error) {
    return { passed: true, errors: [] };
  }

  const errors = error.failures().map((failure) => {
    const path = failure.path.join('.');
    return `${path || 'root'}: ${failure.message}`;
  });

  return { passed: false, errors };
}
