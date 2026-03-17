import { useState } from 'react';
import {
  type BenchmarkMode,
  type DatasetProfile,
  runValidationBenchmarks,
  type BenchmarkScenario,
} from '../bench/validationBenchmark';

export default function BenchmarkDashboard() {
  const [datasetSize, setDatasetSize] = useState<number>(10000);
  const [runs, setRuns] = useState<number>(10);
  const [mode, setMode] = useState<BenchmarkMode>('detailed-errors');
  const [profile, setProfile] = useState<DatasetProfile>('both');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BenchmarkScenario[]>([]);
  const [error, setError] = useState<string>('');

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
    } catch {
      setError('Benchmark failed. Try smaller dataset size or fewer runs.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="demo-section">
      <h2>Benchmark Dashboard</h2>
      <p className="approach-description">
        Run all four validators in-browser on identical generated datasets and compare
        timing side-by-side. These numbers are machine-dependent and best used for
        relative comparison.
      </p>

      <p className="benchmark-mode-note">
        Quality metrics: <code>false accept %</code> means invalid inputs that were wrongly
        accepted; <code>false reject %</code> means valid inputs that were wrongly rejected.
      </p>

      <p className="benchmark-mode-note">
        <strong>Mode:</strong> <code>detailed-errors</code> includes richer failure tracking,
        while <code>fast-boolean</code> focuses on simple pass/fail checks.
      </p>

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
          {loading ? 'Running...' : 'Run benchmark'}
        </button>
      </div>

      {error && <p className="benchmark-error">{error}</p>}

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
    </section>
  );
}
