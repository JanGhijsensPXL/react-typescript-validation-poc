import type { TestCase } from '../data/testCases';
import { validateWithAjv } from '../schemas/slaughterRecordAjv';

type Props = {
  testCases: TestCase[];
};

export default function AjvValidationDemo({ testCases }: Props) {
  return (
    <section className="demo-section">
      <h2>Approach 6 - TypeScript + AJV Runtime Validation</h2>
      <p className="approach-description">
        AJV validates data at <strong>runtime</strong> using JSON Schema rules. It is strict,
        catches unknown fields, type mismatches, and boundary violations, and fits systems
        that share schema contracts across frontend and backend.
      </p>
      <div className="test-case-grid">
        {testCases.map((tc) => {
          const result = validateWithAjv(tc.data);
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
                {missed && <span className="missed-badge">⚠ Invalid input NOT detected</span>}
                {caught && <span className="caught-badge">✓ Invalid input detected</span>}
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
