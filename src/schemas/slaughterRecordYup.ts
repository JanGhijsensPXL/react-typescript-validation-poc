import * as yup from 'yup';

const EAR_TAG_ID_PATTERN = /^SL-\d{4}-\d{3,6}$/;

export const slaughterRecordYupSchema = yup
  .object({
    id: yup
      .string()
      .required('ID is required')
      .matches(EAR_TAG_ID_PATTERN, 'ID must match ear-tag format SL-YYYY-NNN'),
    herderName: yup
      .string()
      .required('Herder name is required')
      .min(2, 'Herder name must be at least 2 characters')
      .max(100, 'Herder name must be at most 100 characters'),
    type: yup
      .mixed<'male' | 'female' | 'child' | 'steralised male'>()
      .oneOf(
        ['male', 'female', 'child', 'steralised male'],
        'Type must be one of: male, female, child, steralised male',
      )
      .required('Type is required'),
    slaughterDate: yup
      .string()
      .required('Date is required')
      .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .test('is-valid-calendar-date', 'Date must be a valid calendar date', (val) => {
        if (!val) {
          return false;
        }
        return !Number.isNaN(Date.parse(val));
      })
      .test('is-not-future-date', 'Date cannot be in the future', (val) => {
        if (!val) {
          return false;
        }

        const date = new Date(`${val}T00:00:00Z`);
        const now = new Date();
        const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        return date.getTime() <= todayUtc;
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
