import type { SlaughterRecord } from '../types/slaughterRecord';

export type TestCase = {
  label: string;
  description: string;
  data: unknown;
  expectValid: boolean;
};

export const VALID_RECORD: SlaughterRecord = {
  id: 'SL-2024-001',
  herderName: 'Aslak Eira',
  animalSpecies: 'reindeer',
  slaughterDate: '2024-11-15',
  animalCount: 45,
  totalWeightKg: 1800,
  slaughterhouseId: 'SH-NORTH-07',
  veterinarianApproved: true,
};

export const TEST_CASES: TestCase[] = [
  {
    label: 'Valid record',
    description: 'A complete, properly formatted slaughter record.',
    data: { ...VALID_RECORD },
    expectValid: true,
  },
  {
    label: 'Missing herder name',
    description: 'The herder name field is an empty string.',
    data: { ...VALID_RECORD, herderName: '' },
    expectValid: false,
  },
  {
    label: 'Invalid species',
    description: '"pig" is not an accepted animal species.',
    data: { ...VALID_RECORD, animalSpecies: 'pig' },
    expectValid: false,
  },
  {
    label: 'Negative animal count',
    description: 'Animal count is -5, which is not physically possible.',
    data: { ...VALID_RECORD, animalCount: -5 },
    expectValid: false,
  },
  {
    label: 'Zero total weight',
    description: 'Total weight is 0 kg, which violates the positive constraint.',
    data: { ...VALID_RECORD, totalWeightKg: 0 },
    expectValid: false,
  },
  {
    label: 'Malformed date',
    description: '"15-11-2024" does not match the required YYYY-MM-DD format.',
    data: { ...VALID_RECORD, slaughterDate: '15-11-2024' },
    expectValid: false,
  },
  {
    label: 'Missing veterinarian approval (string instead of boolean)',
    description:
      'TypeScript types cannot catch "true" (string) passed as veterinarianApproved at runtime.',
    data: { ...VALID_RECORD, veterinarianApproved: 'true' },
    expectValid: false,
  },
  {
    label: 'Non-integer animal count',
    description: '12.5 animals is not a whole number.',
    data: { ...VALID_RECORD, animalCount: 12.5 },
    expectValid: false,
  },
];
