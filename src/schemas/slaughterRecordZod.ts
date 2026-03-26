import { z } from 'zod';

const EAR_TAG_ID_PATTERN = /^SL-\d{4}-\d{3,6}$/;

function isNotFutureDate(dateString: string): boolean {
  const date = new Date(`${dateString}T00:00:00Z`);
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return date.getTime() <= todayUtc;
}

/**
 * Zod schema for a reindeer slaughter record.
 * Provides runtime validation with detailed error messages for each field.
 */
export const slaughterRecordSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .regex(EAR_TAG_ID_PATTERN, 'ID must match ear-tag format SL-YYYY-NNN'),
  herderName: z
    .string()
    .min(2, 'Herder name must be at least 2 characters')
    .max(100, 'Herder name must be at most 100 characters'),
  animalSpecies: z.enum(['reindeer', 'elk', 'moose'], {
    error: 'Animal species must be one of: reindeer, elk, moose',
  }),
  slaughterDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((val) => !isNaN(Date.parse(val)), 'Date must be a valid calendar date')
    .refine((val) => isNotFutureDate(val), 'Date cannot be in the future'),
  animalCount: z
    .number({ error: 'Animal count must be a number' })
    .int('Animal count must be a whole number')
    .min(1, 'Animal count must be at least 1')
    .max(10000, 'Animal count must be at most 10,000'),
  totalWeightKg: z
    .number({ error: 'Total weight must be a number' })
    .positive('Total weight must be greater than 0')
    .max(1_000_000, 'Total weight must be at most 1,000,000 kg'),
  slaughterhouseId: z.string().min(1, 'Slaughterhouse ID is required'),
  veterinarianApproved: z.boolean({
    error: 'Veterinarian approval must be true or false',
  }),
}).strict();

export type SlaughterRecordInput = z.infer<typeof slaughterRecordSchema>;
