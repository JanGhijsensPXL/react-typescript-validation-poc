import { useState } from 'react';
import {
  runValidationBenchmarks,
  type BenchmarkScenario,
} from '../bench/validationBenchmark';

export default function BenchmarkDashboard() {
  const [datasetSize, setDatasetSize] = useState<number>(10000);
  const [runs, setRuns] = useState<number>(10);
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
        <button type="button" className="benchmark-run-btn" onClick={handleRun} disabled={loading}>
          {loading ? 'Running...' : 'Run benchmark'}
        </button>
      </div>

      {error && <p className="benchmark-error">{error}</p>}

      {results.map((scenario) => (
        <div key={scenario.title} className="benchmark-panel">
          <div className="benchmark-panel-header">
            <h3>{scenario.title}</h3>
            <span>
              {scenario.size.toLocaleString()} records x {scenario.runs} runs
            </span>
          </div>
          <div className="benchmark-table-wrap">
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th>Validator</th>
                  <th>avg ms/run</th>
                  <th>avg us/item</th>
                  <th>elapsed ms</th>
                  <th>pass count</th>
                </tr>
              </thead>
              <tbody>
                {scenario.rows
                  .slice()
                  .sort((a, b) => a.avgUsPerItem - b.avgUsPerItem)
                  .map((row) => (
                    <tr key={row.validator}>
                      <td>{row.validator}</td>
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
      ))}
    </section>
  );
}
