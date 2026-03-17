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
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  falseAcceptRate: number;
  falseRejectRate: number;
};

export type BenchmarkScenario = {
  title: string;
  size: number;
  runs: number;
  kind: 'valid' | 'invalid';
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

type BenchmarkItem = {
  input: unknown;
  expectedValid: boolean;
};

function cloneValid(index: number): unknown {
  return {
    ...VALID_RECORD,
    id: `SL-2024-${String(index + 1).padStart(6, '0')}`,
    animalCount: (index % 200) + 1,
    totalWeightKg: 500 + (index % 5000),
  };
}

function cloneInvalid(index: number): unknown {
  const mod = index % 9;
  if (mod === 0) return { ...VALID_RECORD, id: '' };
  if (mod === 1) return { ...VALID_RECORD, herderName: '' };
  if (mod === 2) return { ...VALID_RECORD, animalSpecies: 'pig' };
  if (mod === 3) return { ...VALID_RECORD, slaughterDate: '15-11-2024' };
  if (mod === 4) return { ...VALID_RECORD, slaughterDate: '2024-13-99' };
  if (mod === 5) return { ...VALID_RECORD, animalCount: -1 };
  if (mod === 6) return { ...VALID_RECORD, totalWeightKg: 0 };
  if (mod === 7) return { ...VALID_RECORD, veterinarianApproved: 'true' };
  return { ...VALID_RECORD, extraField: 'unexpected' };
}

function makeDataset(
  size: number,
  kind: 'valid' | 'invalid',
): BenchmarkItem[] {
  if (kind === 'valid') {
    return Array.from({ length: size }, (_, i) => ({
      input: cloneValid(i),
      expectedValid: true,
    }));
  }

  if (kind === 'invalid') {
    return Array.from({ length: size }, (_, i) => ({
      input: cloneInvalid(i),
      expectedValid: false,
    }));
  }

  return [];
}

function benchOne(validator: Validator, dataset: BenchmarkItem[], runs: number): BenchmarkRow {
  // Warm-up run to reduce one-time JIT overhead.
  for (let i = 0; i < 2; i += 1) {
    for (const item of dataset) {
      validator.run(item.input);
    }
  }

  let passCount = 0;
  const start = performance.now();

  for (let run = 0; run < runs; run += 1) {
    for (const item of dataset) {
      if (validator.run(item.input)) {
        passCount += 1;
      }
    }
  }

  const elapsedMs = performance.now() - start;
  const totalItems = dataset.length * runs;

  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;

  // Compute classification quality metrics on a single pass.
  for (const item of dataset) {
    const predictedValid = validator.run(item.input);

    if (predictedValid && item.expectedValid) {
      truePositive += 1;
    } else if (!predictedValid && !item.expectedValid) {
      trueNegative += 1;
    } else if (predictedValid && !item.expectedValid) {
      falsePositive += 1;
    } else {
      falseNegative += 1;
    }
  }

  const sampleTotal = dataset.length;
  const totalActualValid = truePositive + falseNegative;
  const totalActualInvalid = trueNegative + falsePositive;
  const precisionDenominator = truePositive + falsePositive;
  const recallDenominator = truePositive + falseNegative;
  const precision = precisionDenominator === 0 ? 0 : truePositive / precisionDenominator;
  const recall = recallDenominator === 0 ? 0 : truePositive / recallDenominator;
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  return {
    validator: validator.label,
    avgMsPerRun: elapsedMs / runs,
    avgUsPerItem: (elapsedMs * 1000) / totalItems,
    elapsedMs,
    passCount,
    truePositive,
    trueNegative,
    falsePositive,
    falseNegative,
    accuracy: sampleTotal === 0 ? 0 : (truePositive + trueNegative) / sampleTotal,
    precision,
    recall,
    f1,
    falseAcceptRate: totalActualInvalid === 0 ? 0 : falsePositive / totalActualInvalid,
    falseRejectRate: totalActualValid === 0 ? 0 : falseNegative / totalActualValid,
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

  if (profile === 'both' || profile === 'valid-only') {
    scenarios.push({
      title: 'Valid dataset',
      size,
      runs,
      kind: 'valid',
    });
  }

  if (profile === 'both' || profile === 'invalid-only') {
    scenarios.push({
      title: 'Invalid dataset',
      size,
      runs,
      kind: 'invalid',
    });
  }

  const results: BenchmarkScenario[] = [];

  for (const scenario of scenarios) {
    await new Promise<void>((resolve) => {
      globalThis.setTimeout(() => resolve(), 0);
    });

    const dataset = makeDataset(scenario.size, scenario.kind);
    const rows = validators.map((validator) => benchOne(validator, dataset, scenario.runs));
    results.push({ ...scenario, rows });
  }

  return results;
}
