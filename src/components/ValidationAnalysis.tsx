import { useState } from 'react';
import {
  type BenchmarkMode,
  type DatasetProfile,
  runValidationBenchmarks,
  type BenchmarkRow,
  type BenchmarkScenario,
} from '../bench/validationBenchmark';
import { validateWithTypeScriptOnly } from './TypeScriptOnlyDemo';
import { slaughterRecordSchema } from '../schemas/slaughterRecordZod';
import { validateWithSuperstruct } from '../schemas/slaughterRecordSuperstruct';
import { validateWithYup } from '../schemas/slaughterRecordYup';
import { validateWithTypanion } from '../schemas/slaughterRecordTypanion';
import { validateWithAjv } from '../schemas/slaughterRecordAjv';
import { validateWithJoi } from '../schemas/slaughterRecordJoi';
import { VALID_RECORD } from '../data/testCases';
import zodSchemaSource from '../schemas/slaughterRecordZod.ts?raw';
import superstructSchemaSource from '../schemas/slaughterRecordSuperstruct.ts?raw';
import yupSchemaSource from '../schemas/slaughterRecordYup.ts?raw';
import typanionSchemaSource from '../schemas/slaughterRecordTypanion.ts?raw';
import ajvSchemaSource from '../schemas/slaughterRecordAjv.ts?raw';
import joiSchemaSource from '../schemas/slaughterRecordJoi.ts?raw';

type SnapshotRow = {
  validator: string;
  validAccuracyPct: number;
  invalidDetectionPct: number;
  falseAcceptPct: number;
  falseRejectPct: number;
  validUsPerItem: number;
  invalidUsPerItem: number;
  consistencyRatio: number;
};

type ValidationResult = {
  passed: boolean;
  errors: string[];
};

type DiagnosticRow = {
  validator: string;
  avgErrorsPerRejected: number;
  multiErrorRatePct: number;
  fieldCoveragePct: number;
  unknownFieldPolicy: 'rejects' | 'accepts';
};

type SourceMetricRow = {
  validator: string;
  schemaLoc: number;
  sourceBytes: number;
  primitiveDiversity: number;
  customHelperCount: number;
  changeCostIndex: number;
};

type ValidatorAdapter = {
  name: string;
  run: (input: unknown) => ValidationResult;
};

const KNOWN_FIELDS = [
  'id',
  'herderName',
  'animalSpecies',
  'slaughterDate',
  'animalCount',
  'totalWeightKg',
  'slaughterhouseId',
  'veterinarianApproved',
] as const;

type SourceMetricDraft = Omit<SourceMetricRow, 'changeCostIndex'> & {
  rawScore: number;
};

function countNonEmptyNonCommentLines(source: string): number {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('//'))
    .filter((line) => !line.startsWith('/*'))
    .filter((line) => !line.startsWith('*'))
    .filter((line) => !line.startsWith('*/')).length;
}

function countOccurrences(source: string, token: string): number {
  return source.split(token).length - 1;
}

function computeSourceMetricDraft(
  validator: string,
  source: string,
  primitiveTokens: string[],
  helperTokens: string[],
): SourceMetricDraft {
  const schemaLoc = countNonEmptyNonCommentLines(source);
  const sourceBytes = source.length;

  const primitiveDiversity = primitiveTokens.filter((token) => source.includes(token)).length;
  const customHelperCount = helperTokens.reduce(
    (total, token) => total + countOccurrences(source, token),
    0,
  );

  // Higher score means more moving parts for future rule changes.
  const rawScore = schemaLoc * 0.6 + primitiveDiversity * 4 + customHelperCount * 6;

  return {
    validator,
    schemaLoc,
    sourceBytes,
    primitiveDiversity,
    customHelperCount,
    rawScore,
  };
}

function buildSourceMetricRows(): SourceMetricRow[] {
  const drafts: SourceMetricDraft[] = [
    computeSourceMetricDraft(
      'Zod',
      zodSchemaSource,
      [
        'z.object',
        'z.string',
        'z.number',
        'z.boolean',
        'z.enum',
        '.regex(',
        '.refine(',
        '.int(',
        '.min(',
        '.max(',
        '.positive(',
        '.strict(',
      ],
      ['.refine('],
    ),
    computeSourceMetricDraft(
      'Superstruct',
      superstructSchemaSource,
      [
        'object(',
        'string()',
        'number()',
        'integer()',
        'boolean()',
        'enums(',
        'size(',
        'pattern(',
        'min(',
        'max(',
        'refine(',
      ],
      ['refine('],
    ),
    computeSourceMetricDraft(
      'Yup',
      yupSchemaSource,
      [
        'yup.object',
        'yup.string',
        'yup.number',
        'yup.boolean',
        'yup.mixed',
        '.oneOf(',
        '.matches(',
        '.test(',
        '.integer(',
        '.min(',
        '.max(',
        '.moreThan(',
        '.noUnknown(',
        '.strict(',
      ],
      ['.test('],
    ),
    computeSourceMetricDraft(
      'Typanion',
      typanionSchemaSource,
      [
        'isObject(',
        'isString(',
        'isNumber(',
        'isEnum(',
        'isInteger(',
        'isAtLeast(',
        'isAtMost(',
        'hasMinLength(',
        'hasMaxLength(',
        'matchesRegExp(',
        'makeValidator(',
        'cascade(',
      ],
      ['makeValidator('],
    ),
    computeSourceMetricDraft(
      'AJV',
      ajvSchemaSource,
      [
        'type:',
        'properties:',
        'required:',
        'additionalProperties:',
        'minimum:',
        'maximum:',
        'exclusiveMinimum:',
        'minLength:',
        'maxLength:',
        'pattern:',
        'enum:',
      ],
      ['compile(', 'validateWithAjv('],
    ),
    computeSourceMetricDraft(
      'Joi',
      joiSchemaSource,
      [
        'Joi.object(',
        'Joi.string(',
        'Joi.number(',
        'Joi.boolean(',
        '.valid(',
        '.pattern(',
        '.integer(',
        '.min(',
        '.max(',
        '.greater(',
        '.custom(',
        '.unknown(',
      ],
      ['.custom(', 'validateWithJoi('],
    ),
  ];

  const minScore = Math.min(...drafts.map((d) => d.rawScore));

  return drafts
    .map((draft) => ({
      validator: draft.validator,
      schemaLoc: draft.schemaLoc,
      sourceBytes: draft.sourceBytes,
      primitiveDiversity: draft.primitiveDiversity,
      customHelperCount: draft.customHelperCount,
      changeCostIndex: draft.rawScore / minScore,
    }))
    .sort((a, b) => a.changeCostIndex - b.changeCostIndex);
}

function toSummaryRows(validRows: BenchmarkRow[], invalidRows: BenchmarkRow[]): SnapshotRow[] {
  const invalidByValidator = new Map(invalidRows.map((r) => [r.validator, r]));

  return validRows
    .map((valid) => {
      const invalid = invalidByValidator.get(valid.validator);
      if (!invalid) {
        return null;
      }

      const consistencyRatio = invalid.avgUsPerItem / valid.avgUsPerItem;

      return {
        validator: valid.validator,
        validAccuracyPct: valid.accuracy * 100,
        invalidDetectionPct: (1 - invalid.falseAcceptRate) * 100,
        falseAcceptPct: invalid.falseAcceptRate * 100,
        falseRejectPct: valid.falseRejectRate * 100,
        validUsPerItem: valid.avgUsPerItem,
        invalidUsPerItem: invalid.avgUsPerItem,
        consistencyRatio,
      };
    })
    .filter((row): row is SnapshotRow => row !== null)
    .sort((a, b) => a.validUsPerItem - b.validUsPerItem);
}

function makeDiagnosticInvalid(index: number): unknown {
  const mod = index % 14;

  if (mod === 0) return { ...VALID_RECORD, id: '' };
  if (mod === 1) return { ...VALID_RECORD, herderName: '' };
  if (mod === 2) return { ...VALID_RECORD, animalSpecies: 'pig' };
  if (mod === 3) return { ...VALID_RECORD, slaughterDate: '15-11-2024' };
  if (mod === 4) return { ...VALID_RECORD, animalCount: -1 };
  if (mod === 5) return { ...VALID_RECORD, slaughterDate: '2099-01-01' };
  if (mod === 6) return { ...VALID_RECORD, id: 'TAG-24-A7' };
  if (mod === 7) return { ...VALID_RECORD, totalWeightKg: 0 };
  if (mod === 8) return { ...VALID_RECORD, slaughterhouseId: '' };
  if (mod === 9) return { ...VALID_RECORD, veterinarianApproved: 'true' };
  if (mod === 10) return { ...VALID_RECORD, animalCount: 12.5 };
  if (mod === 11) return { ...VALID_RECORD, extraField: 'unexpected' };
  if (mod === 12) return { ...VALID_RECORD, herderName: '', animalCount: -1 };
  return { ...VALID_RECORD, slaughterDate: '2024-13-99', totalWeightKg: 0 };
}

function extractPathTokens(errors: string[]): string[] {
  const tokens: string[] = [];

  for (const err of errors) {
    if (err.startsWith('Missing fields:')) {
      const parts = err.replace('Missing fields:', '').split(',');
      for (const part of parts) {
        const token = part.trim();
        if (token.length > 0) {
          tokens.push(token);
        }
      }
      continue;
    }

    const path = err.split(':')[0]?.trim();
    if (path) {
      tokens.push(path);
    }
  }

  return tokens;
}

function toDiagnosticRows(adapters: ValidatorAdapter[], sampleSize: number): DiagnosticRow[] {
  const invalidCases = Array.from({ length: sampleSize }, (_, i) => makeDiagnosticInvalid(i));
  const unknownFieldCase = { ...VALID_RECORD, extraField: 'unexpected' };

  return adapters.map((adapter) => {
    let rejected = 0;
    let totalErrors = 0;
    let multiErrorCount = 0;
    const fieldSet = new Set<string>();

    for (const input of invalidCases) {
      const result = adapter.run(input);
      if (!result.passed) {
        rejected += 1;
        totalErrors += result.errors.length;
        if (result.errors.length > 1) {
          multiErrorCount += 1;
        }

        const paths = extractPathTokens(result.errors);
        for (const p of paths) {
          fieldSet.add(p);
        }
      }
    }

    const knownFieldHits = Array.from(fieldSet).filter((p) =>
      (KNOWN_FIELDS as readonly string[]).includes(p),
    ).length;

    const unknownFieldRejected = !adapter.run(unknownFieldCase).passed;

    return {
      validator: adapter.name,
      avgErrorsPerRejected: rejected === 0 ? 0 : totalErrors / rejected,
      multiErrorRatePct: rejected === 0 ? 0 : (multiErrorCount / rejected) * 100,
      fieldCoveragePct: (knownFieldHits / KNOWN_FIELDS.length) * 100,
      unknownFieldPolicy: unknownFieldRejected ? 'rejects' : 'accepts',
    };
  });
}

export default function ValidationAnalysis() {
  const [datasetSize, setDatasetSize] = useState<number>(10000);
  const [runs, setRuns] = useState<number>(10);
  const [mode, setMode] = useState<BenchmarkMode>('detailed-errors');
  const [profile, setProfile] = useState<DatasetProfile>('both');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BenchmarkScenario[]>([]);
  const [error, setError] = useState<string>('');
  const [snapshotRows, setSnapshotRows] = useState<SnapshotRow[]>([]);
  const [diagnosticRows, setDiagnosticRows] = useState<DiagnosticRow[]>([]);
  const sourceMetricRows = buildSourceMetricRows();

  const zodFlowSteps = [
    'TEST_CASES are created as unknown inputs in src/data/testCases.ts.',
    'App passes TEST_CASES into ZodValidationDemo when the Zod tab is selected.',
    'slaughterRecordSchema defines runtime constraints for every field in src/schemas/slaughterRecordZod.ts.',
    'validateWithZod calls slaughterRecordSchema.safeParse(data) for each case.',
    'On failure, Zod issues are mapped to field: message strings for display.',
    'UI compares actual result against expectValid and labels each case as caught or missed.',
  ];

  async function handleRun() {
    try {
      setLoading(true);
      setError('');
      const rows = await runValidationBenchmarks({
        size: datasetSize,
        runs,
        mode,
        profile,
      });
      setResults(rows);

      // Compute snapshot metrics for tradeoff tables
      const valid = rows.find((s) => s.kind === 'valid');
      const invalid = rows.find((s) => s.kind === 'invalid');

      if (valid && invalid) {
        setSnapshotRows(toSummaryRows(valid.rows, invalid.rows));

        const adapters: ValidatorAdapter[] = [
          {
            name: 'TypeScript only',
            run: (input) => {
              const result = validateWithTypeScriptOnly(input);
              return {
                passed: result.passed,
                errors: result.passed ? [] : [result.note],
              };
            },
          },
          {
            name: 'Zod',
            run: (input) => {
              const result = slaughterRecordSchema.safeParse(input);
              if (result.success) {
                return { passed: true, errors: [] };
              }
              return {
                passed: false,
                errors: result.error.issues.map(
                  (issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`,
                ),
              };
            },
          },
          {
            name: 'Superstruct',
            run: (input) => validateWithSuperstruct(input),
          },
          {
            name: 'Yup',
            run: (input) => validateWithYup(input),
          },
          {
            name: 'Typanion',
            run: (input) => validateWithTypanion(input),
          },
          {
            name: 'AJV',
            run: (input) => validateWithAjv(input),
          },
          {
            name: 'Joi',
            run: (input) => validateWithJoi(input),
          },
        ];

        setDiagnosticRows(toDiagnosticRows(adapters, Math.min(datasetSize, 4000)));
      }
    } catch {
      setError('Benchmark failed. Try smaller dataset size or fewer runs.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="demo-section">
      <h2>Validation Analysis</h2>
      <p className="approach-description">
        Comprehensive validator comparison: speed benchmarks, accuracy metrics, error quality, 
        strictness policies, and maintainability complexity. Adjust parameters and run to see all 
        measurements update together.
      </p>

      <p className="benchmark-mode-note">
        <strong>Quality metrics:</strong> <code>false accept %</code> = invalid inputs wrongly 
        accepted; <code>false reject %</code> = valid inputs wrongly rejected.
      </p>

      <p className="benchmark-mode-note">
        <strong>Mode:</strong> <code>detailed-errors</code> includes richer failure tracking,
        while <code>fast-boolean</code> focuses on simple pass/fail checks.
      </p>

      <div className="zod-flow-panel">
        <h3>Zod Validation Flow</h3>
        <ol className="zod-flow-list">
          {zodFlowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="benchmark-controls">
        <label className="benchmark-field">
          Dataset size
          <input
            type="number"
            min={100}
            max={100000}
            step={100}
            value={datasetSize}
            onChange={(e) => setDatasetSize(Number(e.target.value))}
          />
        </label>
        <label className="benchmark-field">
          Runs
          <input
            type="number"
            min={1}
            max={100}
            value={runs}
            onChange={(e) => setRuns(Number(e.target.value))}
          />
        </label>
        <label className="benchmark-field">
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as BenchmarkMode)}>
            <option value="detailed-errors">detailed-errors</option>
            <option value="fast-boolean">fast-boolean</option>
          </select>
        </label>
        <label className="benchmark-field">
          Dataset profile
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as DatasetProfile)}
          >
            <option value="both">both</option>
            <option value="valid-only">valid-only</option>
            <option value="invalid-only">invalid-only</option>
          </select>
        </label>
        <button type="button" className="benchmark-run-btn" onClick={handleRun} disabled={loading}>
          {loading ? 'Analyzing...' : 'Run analysis'}
        </button>
      </div>

      {error && <p className="benchmark-error">{error}</p>}

      {/* Speed Benchmarks Section */}
      {results.map((scenario) => {
        const sortedRows = scenario.rows
          .slice()
          .sort((a, b) => a.avgUsPerItem - b.avgUsPerItem);

        const minUs = Math.min(...sortedRows.map((row) => row.avgUsPerItem));
        const maxUs = Math.max(...sortedRows.map((row) => row.avgUsPerItem));
        const rangeUs = maxUs - minUs;

        const speedPercent = (avgUsPerItem: number): number => {
          if (rangeUs === 0) {
            return 100;
          }
          return ((maxUs - avgUsPerItem) / rangeUs) * 100;
        };

        return (
          <div key={scenario.title} className="benchmark-panel">
            <div className="benchmark-panel-header">
              <h3>{scenario.title}</h3>
              <span>
                {scenario.size.toLocaleString()} records x {scenario.runs} runs
              </span>
            </div>

            <div className="benchmark-chart" aria-label={`${scenario.title} speed comparison`}>
              <p className="benchmark-chart-caption">Relative speed (longer bar = faster)</p>
              {sortedRows.map((row) => (
                <div className="benchmark-chart-row" key={`${scenario.title}-${row.validator}`}>
                  <div className="benchmark-chart-label">{row.validator}</div>
                  <div className="benchmark-chart-track">
                    <div
                      className="benchmark-chart-fill"
                      style={{ width: `${Math.max(8, speedPercent(row.avgUsPerItem)).toFixed(1)}%` }}
                    />
                  </div>
                  <div className="benchmark-chart-value">{row.avgUsPerItem.toFixed(3)} us/item</div>
                </div>
              ))}
            </div>

            <div className="benchmark-table-wrap">
              <table className="benchmark-table">
                <thead>
                  <tr>
                    <th>Validator</th>
                    <th>accuracy %</th>
                    <th>F1</th>
                    <th>false accept %</th>
                    <th>false reject %</th>
                    <th>avg ms/run</th>
                    <th>avg us/item</th>
                    <th>elapsed ms</th>
                    <th>pass count</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row) => (
                    <tr key={row.validator}>
                      <td>{row.validator}</td>
                      <td>{(row.accuracy * 100).toFixed(2)}</td>
                      <td>{row.f1.toFixed(3)}</td>
                      <td>{(row.falseAcceptRate * 100).toFixed(2)}</td>
                      <td>{(row.falseRejectRate * 100).toFixed(2)}</td>
                      <td>{row.avgMsPerRun.toFixed(3)}</td>
                      <td>{row.avgUsPerItem.toFixed(3)}</td>
                      <td>{row.elapsedMs.toFixed(2)}</td>
                      <td>{row.passCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Change-Cost & Complexity Section */}
      <div className="benchmark-panel">
        <div className="benchmark-panel-header">
          <h3>Change-Cost & Complexity Snapshot</h3>
          <span>Source-based proxy metrics (lower change-cost index is better)</span>
        </div>
        <div className="benchmark-table-wrap">
          <table className="benchmark-table">
            <thead>
              <tr>
                <th>Validator</th>
                <th>schema LOC</th>
                <th>source bytes</th>
                <th>primitive diversity</th>
                <th>custom helper count</th>
                <th>change-cost index</th>
              </tr>
            </thead>
            <tbody>
              {sourceMetricRows.map((row) => (
                <tr key={row.validator}>
                  <td>{row.validator}</td>
                  <td>{row.schemaLoc}</td>
                  <td>{row.sourceBytes}</td>
                  <td>{row.primitiveDiversity}</td>
                  <td>{row.customHelperCount}</td>
                  <td>{row.changeCostIndex.toFixed(2)}x</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Snapshot Section */}
      {snapshotRows.length > 0 && (
        <div className="benchmark-panel">
          <div className="benchmark-panel-header">
            <h3>Performance Snapshot</h3>
            <span>
              {datasetSize.toLocaleString()} records x {runs} runs (detailed-errors mode)
            </span>
          </div>
          <div className="benchmark-table-wrap">
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th>Validator</th>
                  <th>valid accuracy %</th>
                  <th>invalid detection %</th>
                  <th>false accept %</th>
                  <th>false reject %</th>
                  <th>valid us/item</th>
                  <th>invalid us/item</th>
                  <th>consistency ratio</th>
                </tr>
              </thead>
              <tbody>
                {snapshotRows.map((row) => (
                  <tr key={row.validator}>
                    <td>{row.validator}</td>
                    <td>{row.validAccuracyPct.toFixed(2)}</td>
                    <td>{row.invalidDetectionPct.toFixed(2)}</td>
                    <td>{row.falseAcceptPct.toFixed(2)}</td>
                    <td>{row.falseRejectPct.toFixed(2)}</td>
                    <td>{row.validUsPerItem.toFixed(3)}</td>
                    <td>{row.invalidUsPerItem.toFixed(3)}</td>
                    <td>{row.consistencyRatio.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error & Strictness Section */}
      {diagnosticRows.length > 0 && (
        <div className="benchmark-panel">
          <div className="benchmark-panel-header">
            <h3>Error & Strictness Snapshot</h3>
            <span>{Math.min(datasetSize, 4000).toLocaleString()} sampled invalid payloads</span>
          </div>
          <div className="benchmark-table-wrap">
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th>Validator</th>
                  <th>avg errors/rejected</th>
                  <th>multi-error rate %</th>
                  <th>field coverage %</th>
                  <th>unknown-field policy</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticRows.map((row) => (
                  <tr key={row.validator}>
                    <td>{row.validator}</td>
                    <td>{row.avgErrorsPerRejected.toFixed(2)}</td>
                    <td>{row.multiErrorRatePct.toFixed(2)}</td>
                    <td>{row.fieldCoveragePct.toFixed(2)}</td>
                    <td>{row.unknownFieldPolicy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reference Guide */}
      <div className="tradeoffs-panel">
        <h3>Metric Reference</h3>
        <ul className="tradeoffs-list">
          <li><strong>Valid accuracy %:</strong> how often valid inputs are accepted.</li>
          <li><strong>Invalid detection %:</strong> how often invalid inputs are correctly rejected.</li>
          <li><strong>False accept %:</strong> invalid inputs that slipped through.</li>
          <li><strong>False reject %:</strong> valid inputs that were wrongly rejected.</li>
          <li><strong>Consistency ratio:</strong> invalid us/item ÷ valid us/item. Lower = more stable cost.</li>
          <li><strong>Avg errors/rejected:</strong> average number of issues returned per rejected payload.</li>
          <li><strong>Multi-error rate %:</strong> how often a validator returns multiple issues for a bad payload.</li>
          <li><strong>Field coverage %:</strong> share of core fields that appear in reported error paths.</li>
          <li><strong>Unknown-field policy:</strong> whether extra keys are rejected or accepted.</li>
          <li><strong>Change-cost index:</strong> relative schema complexity from LOC, API diversity, and helpers (lower is simpler).</li>
        </ul>
      </div>
    </section>
  );
}
