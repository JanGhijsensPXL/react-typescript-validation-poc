import Joi from 'joi';

export const slaughterRecordJoiSchema = Joi.object({
  id: Joi.string().min(1).required(),
  herderName: Joi.string().min(2).max(100).required(),
  animalSpecies: Joi.string().valid('reindeer', 'elk', 'moose').required(),
  slaughterDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom((value, helpers) => {
      if (Number.isNaN(Date.parse(value))) {
        return helpers.error('date.invalid');
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
