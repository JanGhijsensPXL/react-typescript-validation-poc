import type { TestCase } from '../data/testCases';
import { validateWithJoi } from '../schemas/slaughterRecordJoi';

type Props = {
  testCases: TestCase[];
};

export default function JoiValidationDemo({ testCases }: Props) {
  return (
    <section className="demo-section">
      <h2>Approach 7 - TypeScript + Joi Runtime Validation</h2>
      <p className="approach-description">
        Joi validates data at <strong>runtime</strong> with expressive schema rules and rich
        error details. It catches wrong types, unknown fields, malformed dates, and
        out-of-range values while keeping validation logic centralized.
      </p>
      <div className="test-case-grid">
        {testCases.map((tc) => {
          const result = validateWithJoi(tc.data);
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
