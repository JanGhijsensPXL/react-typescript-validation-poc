import { performance } from 'node:perf_hooks';
import { as } from 'typanion';
import { validate } from 'superstruct';
import { validateWithTypeScriptOnly } from '../src/components/TypeScriptOnlyDemo';
import { slaughterRecordSchema } from '../src/schemas/slaughterRecordSchema';
import { slaughterRecordSuperstructSchema } from '../src/schemas/slaughterRecordSuperstruct';
import { slaughterRecordTypanionSchema } from '../src/schemas/slaughterRecordTypanion';
import { VALID_RECORD } from '../src/data/testCases';

type Validator = (input: unknown) => boolean;

type RunResult = {
  label: string;
  runs: number;
  itemsPerRun: number;
  totalItems: number;
  elapsedMs: number;
  avgMsPerRun: number;
  avgUsPerItem: number;
  passCount: number;
};

function cloneWithMutation(index: number, validOnly: boolean): unknown {
  if (validOnly) {
    return {
      ...VALID_RECORD,
      id: `SL-2024-${String(index + 1).padStart(6, '0')}`,
      animalCount: (index % 200) + 1,
      totalWeightKg: 500 + (index % 5000),
    };
  }

  const mod = index % 8;
  if (mod === 0) return { ...VALID_RECORD, id: '' };
  if (mod === 1) return { ...VALID_RECORD, herderName: '' };
  if (mod === 2) return { ...VALID_RECORD, animalSpecies: 'pig' };
  if (mod === 3) return { ...VALID_RECORD, slaughterDate: '15-11-2024' };
  if (mod === 4) return { ...VALID_RECORD, slaughterDate: '2024-13-99' };
  if (mod === 5) return { ...VALID_RECORD, animalCount: -1 };
  if (mod === 6) return { ...VALID_RECORD, totalWeightKg: 0 };
  return { ...VALID_RECORD, veterinarianApproved: 'true' };
}

function makeDataset(size: number, validOnly: boolean): unknown[] {
  return Array.from({ length: size }, (_, i) => cloneWithMutation(i, validOnly));
}

function bench(label: string, validator: Validator, dataset: unknown[], runs: number): RunResult {
  // Warm-up to reduce JIT skew before measuring.
  for (let i = 0; i < 3; i += 1) {
    for (const item of dataset) {
      validator(item);
    }
  }

  let passCount = 0;
  const start = performance.now();

  for (let run = 0; run < runs; run += 1) {
    for (const item of dataset) {
      if (validator(item)) {
        passCount += 1;
      }
    }
  }

  const elapsedMs = performance.now() - start;
  const totalItems = dataset.length * runs;

  return {
    label,
    runs,
    itemsPerRun: dataset.length,
    totalItems,
    elapsedMs,
    avgMsPerRun: elapsedMs / runs,
    avgUsPerItem: (elapsedMs * 1000) / totalItems,
    passCount,
  };
}

function printSection(title: string, rows: RunResult[]): void {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));

  const printable = rows.map((row) => ({
    Validator: row.label,
    'avg ms/run': row.avgMsPerRun.toFixed(3),
    'avg us/item': row.avgUsPerItem.toFixed(3),
    'elapsed ms': row.elapsedMs.toFixed(2),
    'pass count': row.passCount,
  }));

  console.table(printable);
}

const validators: Array<{ label: string; validate: Validator }> = [
  {
    label: 'TypeScript only',
    validate: (input) => validateWithTypeScriptOnly(input).passed,
  },
  {
    label: 'Zod',
    validate: (input) => slaughterRecordSchema.safeParse(input).success,
  },
  {
    label: 'Superstruct',
    validate: (input) => !validate(input, slaughterRecordSuperstructSchema)[0],
  },
  {
    label: 'Typanion',
    validate: (input) => !as(input, slaughterRecordTypanionSchema, { errors: false, throw: false }).errors,
  },
];

const scenarios = [
  { title: 'Valid dataset (10_000 records)', size: 10_000, runs: 15, validOnly: true },
  { title: 'Invalid/mixed dataset (10_000 records)', size: 10_000, runs: 15, validOnly: false },
];

console.log('Validation Benchmark (single process, local machine)');
console.log('Interpret relatively: use these numbers to compare libraries, not as absolute throughput.');

for (const scenario of scenarios) {
  const dataset = makeDataset(scenario.size, scenario.validOnly);
  const rows = validators.map((entry) => bench(entry.label, entry.validate, dataset, scenario.runs));
  printSection(scenario.title, rows);
}
