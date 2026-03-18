import * as yup from 'yup';

export const slaughterRecordYupSchema = yup
  .object({
    id: yup.string().required('ID is required').min(1, 'ID is required'),
    herderName: yup
      .string()
      .required('Herder name is required')
      .min(2, 'Herder name must be at least 2 characters')
      .max(100, 'Herder name must be at most 100 characters'),
    animalSpecies: yup
      .mixed<'reindeer' | 'elk' | 'moose'>()
      .oneOf(['reindeer', 'elk', 'moose'], 'Animal species must be one of: reindeer, elk, moose')
      .required('Animal species is required'),
    slaughterDate: yup
      .string()
      .required('Date is required')
      .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .test('is-valid-calendar-date', 'Date must be a valid calendar date', (val) => {
        if (!val) {
          return false;
        }
        return !Number.isNaN(Date.parse(val));
      }),
    animalCount: yup
      .number()
      .typeError('Animal count must be a number')
      .required('Animal count is required')
      .integer('Animal count must be a whole number')
      .min(1, 'Animal count must be at least 1')
      .max(10000, 'Animal count must be at most 10,000'),
    totalWeightKg: yup
      .number()
      .typeError('Total weight must be a number')
      .required('Total weight is required')
      .moreThan(0, 'Total weight must be greater than 0')
      .max(1_000_000, 'Total weight must be at most 1,000,000 kg'),
    slaughterhouseId: yup
      .string()
      .required('Slaughterhouse ID is required')
      .min(1, 'Slaughterhouse ID is required'),
    veterinarianApproved: yup
      .boolean()
      .typeError('Veterinarian approval must be true or false')
      .required('Veterinarian approval is required'),
  })
  .noUnknown(true, 'Unknown fields are not allowed')
  .strict(true);

export function validateWithYup(data: unknown): { passed: boolean; errors: string[] } {
  try {
    slaughterRecordYupSchema.validateSync(data, {
      abortEarly: false,
      strict: true,
    });

    return { passed: true, errors: [] };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const issues = error.inner.length > 0 ? error.inner : [error];
      return {
        passed: false,
        errors: issues.map((issue) => `${issue.path ?? 'root'}: ${issue.message}`),
      };
    }

    return { passed: false, errors: ['root: Unknown validation error'] };
  }
}

export type SlaughterRecordYupInput = yup.InferType<typeof slaughterRecordYupSchema>;
