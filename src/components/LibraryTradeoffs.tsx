import { useState } from 'react';
import { runValidationBenchmarks, type BenchmarkRow } from '../bench/validationBenchmark';
import { validateWithTypeScriptOnly } from './TypeScriptOnlyDemo';
import { slaughterRecordSchema } from '../schemas/slaughterRecordSchema';
import { validateWithSuperstruct } from '../schemas/slaughterRecordSuperstruct';
import { validateWithYup } from '../schemas/slaughterRecordYup';
import { validateWithTypanion } from '../schemas/slaughterRecordTypanion';
import { VALID_RECORD } from '../data/testCases';
import zodSchemaSource from '../schemas/slaughterRecordSchema.ts?raw';
import superstructSchemaSource from '../schemas/slaughterRecordSuperstruct.ts?raw';
import yupSchemaSource from '../schemas/slaughterRecordYup.ts?raw';
import typanionSchemaSource from '../schemas/slaughterRecordTypanion.ts?raw';

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
  const mod = index % 12;

  if (mod === 0) return { ...VALID_RECORD, id: '' };
  if (mod === 1) return { ...VALID_RECORD, herderName: '' };
  if (mod === 2) return { ...VALID_RECORD, animalSpecies: 'pig' };
  if (mod === 3) return { ...VALID_RECORD, slaughterDate: '15-11-2024' };
  if (mod === 4) return { ...VALID_RECORD, animalCount: -1 };
  if (mod === 5) return { ...VALID_RECORD, totalWeightKg: 0 };
  if (mod === 6) return { ...VALID_RECORD, slaughterhouseId: '' };
  if (mod === 7) return { ...VALID_RECORD, veterinarianApproved: 'true' };
  if (mod === 8) return { ...VALID_RECORD, animalCount: 12.5 };
  if (mod === 9) return { ...VALID_RECORD, extraField: 'unexpected' };
  if (mod === 10) return { ...VALID_RECORD, herderName: '', animalCount: -1 };
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

export default function LibraryTradeoffs() {
  const [size, setSize] = useState<number>(10000);
  const [runs, setRuns] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [diagnosticRows, setDiagnosticRows] = useState<DiagnosticRow[]>([]);
  const sourceMetricRows = buildSourceMetricRows();

  async function handleGenerate() {
    try {
      setLoading(true);
      setError('');

      const scenarios = await runValidationBenchmarks({
        size,
        runs,
        mode: 'detailed-errors',
        profile: 'both',
      });

      const valid = scenarios.find((s) => s.kind === 'valid');
      const invalid = scenarios.find((s) => s.kind === 'invalid');

      if (!valid || !invalid) {
        setError('Could not compute both valid and invalid scenarios.');
        return;
      }

      setRows(toSummaryRows(valid.rows, invalid.rows));

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
      ];

      setDiagnosticRows(toDiagnosticRows(adapters, Math.min(size, 4000)));
    } catch {
      setError('Failed to generate tradeoff snapshot. Try smaller dataset settings.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="demo-section">
      <h2>Library Tradeoffs</h2>
      <p className="approach-description">
        This tab focuses on measurable comparison points beyond raw speed. It computes a
        benchmark snapshot and shows detection quality, failure behavior, and runtime
        consistency side-by-side.
      </p>

      <div className="tradeoffs-panel">
        <h3>How to read these metrics</h3>
        <ul className="tradeoffs-list">
          <li><strong>Valid accuracy %:</strong> how often valid inputs are accepted.</li>
          <li><strong>Invalid detection %:</strong> how often invalid inputs are correctly rejected.</li>
          <li><strong>False accept %:</strong> invalid inputs that slipped through.</li>
          <li><strong>False reject %:</strong> valid inputs that were wrongly rejected.</li>
          <li><strong>Consistency ratio:</strong> invalid us/item divided by valid us/item. Lower means more stable cost between success/failure paths.</li>
          <li><strong>Avg errors/rejected:</strong> average number of issues returned per rejected payload.</li>
          <li><strong>Multi-error rate %:</strong> how often a validator returns more than one issue for a bad payload.</li>
          <li><strong>Field coverage %:</strong> share of core fields that appear in reported error paths.</li>
          <li><strong>Unknown-field policy:</strong> whether extra keys are rejected or accepted.</li>
          <li><strong>Change-cost index:</strong> relative schema complexity proxy from source LOC, API diversity, and custom helper count (lower is simpler to evolve).</li>
        </ul>
      </div>

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

      <div className="benchmark-controls">
        <label className="benchmark-field">
          Dataset size
          <input
            type="number"
            min={100}
            max={100000}
            step={100}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
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
        <button type="button" className="benchmark-run-btn" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Calculating...' : 'Generate measurable snapshot'}
        </button>
      </div>

      {error && <p className="benchmark-error">{error}</p>}

      {rows.length > 0 && (
        <div className="benchmark-panel">
          <div className="benchmark-panel-header">
            <h3>Measured Snapshot</h3>
            <span>
              {size.toLocaleString()} records x {runs} runs (detailed-errors mode)
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
                {rows.map((row) => (
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

      {diagnosticRows.length > 0 && (
        <div className="benchmark-panel">
          <div className="benchmark-panel-header">
            <h3>Error & Strictness Snapshot</h3>
            <span>{Math.min(size, 4000).toLocaleString()} sampled invalid payloads</span>
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
    </section>
  );
}
