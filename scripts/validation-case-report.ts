import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEST_CASES } from '../src/data/testCases';
import { validateWithTypeScriptOnly } from '../src/components/TypeScriptOnlyDemo';
import { slaughterRecordSchema } from '../src/schemas/slaughterRecordZod';
import { validateWithSuperstruct } from '../src/schemas/slaughterRecordSuperstruct';
import { validateWithYup } from '../src/schemas/slaughterRecordYup';
import { validateWithTypanion } from '../src/schemas/slaughterRecordTypanion';
import { validateWithAjv } from '../src/schemas/slaughterRecordAjv';
import { validateWithJoi } from '../src/schemas/slaughterRecordJoi';

type ValidationOutcome = {
  passed: boolean;
  errors: string[];
};

type ValidatorAdapter = {
  library: string;
  run: (input: unknown) => ValidationOutcome;
};

type ReportRow = {
  caseLabel: string;
  caseDescription: string;
  expectedValid: boolean;
  library: string;
  passed: boolean;
  caughtError: boolean;
  missedError: boolean;
  falseReject: boolean;
  avgDurationMs: number;
  avgDurationUs: number;
  repetitions: number;
  errorCount: number;
  errorMessages: string[];
};

type LibrarySummary = {
  library: string;
  totalCases: number;
  accuracyPct: number;
  caughtErrors: number;
  missedErrors: number;
  falseRejects: number;
  avgDurationUsPerCase: number;
};

type ReportDocument = {
  generatedAt: string;
  repetitionsPerCase: number;
  totals: {
    cases: number;
    libraries: number;
    rows: number;
  };
  rows: ReportRow[];
  summaryByLibrary: LibrarySummary[];
};

const adapters: ValidatorAdapter[] = [
  {
    library: 'TypeScript only',
    run: (input) => {
      const result = validateWithTypeScriptOnly(input);
      return {
        passed: result.passed,
        errors: result.passed ? [] : [result.note],
      };
    },
  },
  {
    library: 'Zod',
    run: (input) => {
      const parsed = slaughterRecordSchema.safeParse(input);
      if (parsed.success) {
        return { passed: true, errors: [] };
      }

      return {
        passed: false,
        errors: parsed.error.issues.map(
          (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
        ),
      };
    },
  },
  {
    library: 'Superstruct',
    run: (input) => validateWithSuperstruct(input),
  },
  {
    library: 'Yup',
    run: (input) => validateWithYup(input),
  },
  {
    library: 'Typanion',
    run: (input) => validateWithTypanion(input),
  },
  {
    library: 'AJV',
    run: (input) => validateWithAjv(input),
  },
  {
    library: 'Joi',
    run: (input) => validateWithJoi(input),
  },
];

function parseRepetitionsArg(argv: string[]): number {
  const raw = argv.find((arg) => arg.startsWith('--reps='));
  if (!raw) {
    return 25;
  }

  const value = Number(raw.split('=')[1]);
  if (!Number.isFinite(value) || value < 1) {
    return 25;
  }

  return Math.floor(value);
}

function runTimed(
  adapter: ValidatorAdapter,
  input: unknown,
  repetitions: number,
): { outcome: ValidationOutcome; avgDurationMs: number } {
  let latest: ValidationOutcome = { passed: false, errors: [] };
  const start = performance.now();

  for (let i = 0; i < repetitions; i += 1) {
    latest = adapter.run(input);
  }

  const totalMs = performance.now() - start;
  return {
    outcome: latest,
    avgDurationMs: totalMs / repetitions,
  };
}

function toCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function rowsToCsv(rows: ReportRow[]): string {
  const headers = [
    'caseLabel',
    'caseDescription',
    'expectedValid',
    'library',
    'passed',
    'caughtError',
    'missedError',
    'falseReject',
    'avgDurationMs',
    'avgDurationUs',
    'repetitions',
    'errorCount',
    'errorMessages',
  ];

  const lines = [headers.join(',')];

  for (const row of rows) {
    const record = [
      row.caseLabel,
      row.caseDescription,
      String(row.expectedValid),
      row.library,
      String(row.passed),
      String(row.caughtError),
      String(row.missedError),
      String(row.falseReject),
      row.avgDurationMs.toFixed(6),
      row.avgDurationUs.toFixed(3),
      String(row.repetitions),
      String(row.errorCount),
      row.errorMessages.join(' | '),
    ].map(toCsvCell);

    lines.push(record.join(','));
  }

  return `${lines.join('\n')}\n`;
}

function buildSummary(rows: ReportRow[]): LibrarySummary[] {
  const byLibrary = new Map<string, ReportRow[]>();

  for (const row of rows) {
    const current = byLibrary.get(row.library) ?? [];
    current.push(row);
    byLibrary.set(row.library, current);
  }

  return Array.from(byLibrary.entries()).map(([library, libraryRows]) => {
    const totalCases = libraryRows.length;
    const matches = libraryRows.filter((row) => row.passed === row.expectedValid).length;
    const caughtErrors = libraryRows.filter((row) => row.caughtError).length;
    const missedErrors = libraryRows.filter((row) => row.missedError).length;
    const falseRejects = libraryRows.filter((row) => row.falseReject).length;
    const avgDurationUsPerCase =
      libraryRows.reduce((total, row) => total + row.avgDurationUs, 0) / totalCases;

    return {
      library,
      totalCases,
      accuracyPct: (matches / totalCases) * 100,
      caughtErrors,
      missedErrors,
      falseRejects,
      avgDurationUsPerCase,
    };
  });
}

function buildReport(repetitions: number): ReportDocument {
  const rows: ReportRow[] = [];

  for (const testCase of TEST_CASES) {
    for (const adapter of adapters) {
      const { outcome, avgDurationMs } = runTimed(adapter, testCase.data, repetitions);

      const caughtError = !testCase.expectValid && !outcome.passed;
      const missedError = !testCase.expectValid && outcome.passed;
      const falseReject = testCase.expectValid && !outcome.passed;

      rows.push({
        caseLabel: testCase.label,
        caseDescription: testCase.description,
        expectedValid: testCase.expectValid,
        library: adapter.library,
        passed: outcome.passed,
        caughtError,
        missedError,
        falseReject,
        avgDurationMs,
        avgDurationUs: avgDurationMs * 1000,
        repetitions,
        errorCount: outcome.errors.length,
        errorMessages: outcome.errors,
      });
    }
  }

  const summaryByLibrary = buildSummary(rows);

  return {
    generatedAt: new Date().toISOString(),
    repetitionsPerCase: repetitions,
    totals: {
      cases: TEST_CASES.length,
      libraries: adapters.length,
      rows: rows.length,
    },
    rows,
    summaryByLibrary,
  };
}

function main(): void {
  const repetitions = parseRepetitionsArg(process.argv.slice(2));
  const report = buildReport(repetitions);

  const reportDir = join(process.cwd(), 'reports');
  mkdirSync(reportDir, { recursive: true });

  const jsonPath = join(reportDir, 'validation-case-report.json');
  const csvPath = join(reportDir, 'validation-case-report.csv');

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(csvPath, rowsToCsv(report.rows), 'utf8');

  console.log('Validation case report generated.');
  console.log(`Rows: ${report.totals.rows} (${report.totals.cases} cases x ${report.totals.libraries} libraries)`);
  console.log(`Repetitions per case: ${report.repetitionsPerCase}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV: ${csvPath}`);
  console.log('\nLibrary summary (accuracy and timing):');
  console.table(
    report.summaryByLibrary.map((row) => ({
      Library: row.library,
      'accuracy %': row.accuracyPct.toFixed(2),
      'caught errors': row.caughtErrors,
      'missed errors': row.missedErrors,
      'false rejects': row.falseRejects,
      'avg us/case': row.avgDurationUsPerCase.toFixed(3),
    })),
  );
}

main();
