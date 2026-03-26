/**
 * TypeScript-only type definitions for a slaughter record.
 * These types provide compile-time safety but cannot validate runtime data.
 */

export type AnimalType = 'male' | 'female' | 'child' | 'steralised male';

export type SlaughterRecord = {
  id: string;
  herderName: string;
  type: AnimalType;
  slaughterDate: string; // ISO 8601 date string (YYYY-MM-DD)
  animalCount: number;
  totalWeightKg: number;
  slaughterhouseId: string;
  veterinarianApproved: boolean;
};
