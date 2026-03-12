import { slaughterRecordSchema } from '../schemas/slaughterRecordSchema';
import type { TestCase } from '../data/testCases';

type Props = {
  testCases: TestCase[];
};

/**
 * Demonstrates TypeScript + Zod runtime validation.
 * Every field is validated against the schema at runtime, catching invalid
 * values that TypeScript alone cannot detect.
 */
function validateWithZod(data: unknown): { passed: boolean; errors: string[] } {
  const result = slaughterRecordSchema.safeParse(data);
  if (result.success) {
    return { passed: true, errors: [] };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );
  return { passed: false, errors };
}

export default function ZodValidationDemo({ testCases }: Props) {
  return (
    <section className="demo-section">
      <h2>Approach 2 — TypeScript + Zod Runtime Validation</h2>
      <p className="approach-description">
        Zod schemas validate every field at <strong>runtime</strong>. Invalid values such as
        wrong types, out-of-range numbers, unsupported enum values, and malformed dates are
        all caught and reported with descriptive error messages.
      </p>
      <div className="test-case-grid">
        {testCases.map((tc) => {
          const result = validateWithZod(tc.data);
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
              {result.errors.length > 0 && (
                <ul className="error-list">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
