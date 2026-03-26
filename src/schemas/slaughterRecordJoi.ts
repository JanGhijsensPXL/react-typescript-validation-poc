import Joi from 'joi';

const EAR_TAG_ID_PATTERN = /^SL-\d{4}-\d{3,6}$/;

export const slaughterRecordJoiSchema = Joi.object({
  id: Joi.string().pattern(EAR_TAG_ID_PATTERN).required(),
  herderName: Joi.string().min(2).max(100).required(),
  animalSpecies: Joi.string().valid('reindeer', 'elk', 'moose').required(),
  slaughterDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom((value, helpers) => {
      if (Number.isNaN(Date.parse(value))) {
        return helpers.error('date.invalid');
      }

      const date = new Date(`${value}T00:00:00Z`);
      const now = new Date();
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      if (date.getTime() > todayUtc) {
        return helpers.error('date.future');
      }

      return value;
    }, 'calendar date')
    .required(),
  animalCount: Joi.number().integer().min(1).max(10000).required(),
  totalWeightKg: Joi.number().greater(0).max(1_000_000).required(),
  slaughterhouseId: Joi.string().min(1).required(),
  veterinarianApproved: Joi.boolean().required(),
})
  .unknown(false)
  .messages({
    'date.invalid': 'Date must be a valid calendar date',
    'date.future': 'Date cannot be in the future',
  });

export function validateWithJoi(data: unknown): { passed: boolean; errors: string[] } {
  const result = slaughterRecordJoiSchema.validate(data, {
    abortEarly: false,
    convert: false,
  });

  if (!result.error) {
    return { passed: true, errors: [] };
  }

  return {
    passed: false,
    errors: result.error.details.map((detail) => {
      const path = detail.path.join('.') || 'root';
      return `${path}: ${detail.message}`;
    }),
  };
}
