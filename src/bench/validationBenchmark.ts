import { as } from 'typanion';
import { validate } from 'superstruct';
import { validateWithTypeScriptOnly } from '../components/TypeScriptOnlyDemo';
import { VALID_RECORD } from '../data/testCases';
import { slaughterRecordSchema } from '../schemas/slaughterRecordSchema';
import { slaughterRecordSuperstructSchema } from '../schemas/slaughterRecordSuperstruct';
import { slaughterRecordTypanionSchema } from '../schemas/slaughterRecordTypanion';

export type BenchmarkRow = {
  validator: string;
  avgMsPerRun: number;
  avgUsPerItem: number;
  elapsedMs: number;
  passCount: number;
};

export type BenchmarkScenario = {
  title: string;
  size: number;
  runs: number;
  validOnly: boolean;
  rows: BenchmarkRow[];
};

export type BenchmarkConfig = {
  size: number;
  runs: number;
  mode?: BenchmarkMode;
  profile?: DatasetProfile;
};

export type BenchmarkMode = 'detailed-errors' | 'fast-boolean';

export type DatasetProfile = 'both' | 'valid-only' | 'invalid-only';

type Validator = {
  label: string;
  run: (input: unknown) => boolean;
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

function benchOne(validator: Validator, dataset: unknown[], runs: number): BenchmarkRow {
  // Warm-up run to reduce one-time JIT overhead.
  for (let i = 0; i < 2; i += 1) {
    for (const item of dataset) {
      validator.run(item);
    }
  }

  let passCount = 0;
  const start = performance.now();

  for (let run = 0; run < runs; run += 1) {
    for (const item of dataset) {
      if (validator.run(item)) {
        passCount += 1;
      }
    }
  }

  const elapsedMs = performance.now() - start;
  const totalItems = dataset.length * runs;

  return {
    validator: validator.label,
    avgMsPerRun: elapsedMs / runs,
    avgUsPerItem: (elapsedMs * 1000) / totalItems,
    elapsedMs,
    passCount,
  };
}

function getValidators(mode: BenchmarkMode): Validator[] {
  if (mode === 'fast-boolean') {
    return [
      {
        label: 'TypeScript only',
        run: (input) => validateWithTypeScriptOnly(input).passed,
      },
      {
        label: 'Zod',
        // Parse/throw pattern approximates fail-fast behavior.
        run: (input) => {
          try {
            slaughterRecordSchema.parse(input);
            return true;
          } catch {
            return false;
          }
        },
      },
      {
        label: 'Superstruct',
        run: (input) => slaughterRecordSuperstructSchema.is(input),
      },
      {
        label: 'Typanion',
        run: (input) => slaughterRecordTypanionSchema(input),
      },
    ];
  }

  return [
    {
      label: 'TypeScript only',
      run: (input) => validateWithTypeScriptOnly(input).passed,
    },
    {
      label: 'Zod',
      run: (input) => slaughterRecordSchema.safeParse(input).success,
    },
    {
      label: 'Superstruct',
      run: (input) => !validate(input, slaughterRecordSuperstructSchema)[0],
    },
    {
      label: 'Typanion',
      run: (input) => !as(input, slaughterRecordTypanionSchema, { errors: true, throw: false }).errors,
    },
  ];
}

export async function runValidationBenchmarks(config: BenchmarkConfig): Promise<BenchmarkScenario[]> {
  const size = Math.max(100, Math.min(config.size, 100000));
  const runs = Math.max(1, Math.min(config.runs, 100));
  const mode: BenchmarkMode = config.mode ?? 'detailed-errors';
  const profile: DatasetProfile = config.profile ?? 'both';
  const validators = getValidators(mode);

  const scenarios: Omit<BenchmarkScenario, 'rows'>[] = [];

  if (profile !== 'invalid-only') {
    scenarios.push({
      title: 'Valid dataset',
      size,
      runs,
      validOnly: true,
    });
  }

  if (profile !== 'valid-only') {
    scenarios.push({
      title: 'Invalid/mixed dataset',
      size,
      runs,
      validOnly: false,
    });
  }

  const results: BenchmarkScenario[] = [];

  for (const scenario of scenarios) {
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(() => resolve(), 0);
    });

    const dataset = makeDataset(scenario.size, scenario.validOnly);
    const rows = validators.map((validator) => benchOne(validator, dataset, scenario.runs));
    results.push({ ...scenario, rows });
  }

  return results;
}
