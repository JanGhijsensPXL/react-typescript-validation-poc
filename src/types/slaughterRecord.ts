/**
 * TypeScript-only type definitions for a reindeer slaughter record.
 * These types provide compile-time safety but cannot validate runtime data.
 */

export type AnimalSpecies = 'reindeer' | 'elk' | 'moose';

export type SlaughterRecord = {
  id: string;
  herderName: string;
  animalSpecies: AnimalSpecies;
  slaughterDate: string; // ISO 8601 date string (YYYY-MM-DD)
  animalCount: number;
  totalWeightKg: number;
  slaughterhouseId: string;
  veterinarianApproved: boolean;
};
