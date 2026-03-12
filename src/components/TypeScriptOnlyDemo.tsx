import type { SlaughterRecord } from '../types/slaughterRecord';
import type { TestCase } from '../data/testCases';

type Props = {
  testCases: TestCase[];
};

/**
 * Demonstrates TypeScript-only validation.
 * TypeScript checks types at compile time, but at runtime the data is accepted
 * as-is — invalid values that satisfy the structural shape pass without error.
 */
export function validateWithTypeScriptOnly(data: unknown): {
  passed: boolean;
  note: string;
} {
  // TypeScript type assertion — no runtime checks, only a compile-time cast.
  const record = data as SlaughterRecord;
  // The only runtime check we can do is whether required keys exist.
  const requiredKeys: (keyof SlaughterRecord)[] = [
    'id',
    'herderName',
    'animalSpecies',
    'slaughterDate',
    'animalCount',
    'totalWeightKg',
    'slaughterhouseId',
    'veterinarianApproved',
  ];
  const missing = requiredKeys.filter(
    (key) => record[key] === undefined || record[key] === null,
  );
  if (missing.length > 0) {
    return { passed: false, note: `Missing fields: ${missing.join(', ')}` };
  }
  return {
    passed: true,
    note: 'Passed — TypeScript cannot detect invalid values at runtime.',
  };
}

export default function TypeScriptOnlyDemo({ testCases }: Props) {
  return (
    <section className="demo-section">
      <h2>Approach 1 — TypeScript Typing Only</h2>
      <p className="approach-description">
        TypeScript provides <strong>compile-time</strong> type checking. At runtime, data is
        cast using <code>as SlaughterRecord</code>. Invalid field values that match the
        structural shape (e.g., negative numbers, wrong enum strings, wrong boolean type) are
        silently accepted.
      </p>
      <div className="test-case-grid">
        {testCases.map((tc) => {
          const result = validateWithTypeScriptOnly(tc.data);
          const statusClass = result.passed ? 'status-pass' : 'status-fail';
          const expectedClass = tc.expectValid ? 'expected-valid' : 'expected-invalid';
          const caught = !tc.expectValid && !result.passed;
          const missed = !tc.expectValid && result.passed;
          return (
            <div key={tc.label} className={`test-card ${statusClass}`}>
              <div className="test-card-header">
                <span className="test-label">{tc.label}</span>
                <span className={`badge ${expectedClass}`}>
                  {tc.expectValid ? 'Expected: Valid' : 'Expected: Invalid'}
                </span>
              </div>
              <p className="test-description">{tc.description}</p>
              <div className="test-result">
                <span className={`result-badge ${result.passed ? 'pass' : 'fail'}`}>
                  {result.passed ? '✓ Accepted' : '✗ Rejected'}
                </span>
                {missed && (
                  <span className="missed-badge">⚠ Invalid input NOT detected</span>
                )}
                {caught && (
                  <span className="caught-badge">✓ Invalid input detected</span>
                )}
              </div>
              <p className="result-note">{result.note}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
