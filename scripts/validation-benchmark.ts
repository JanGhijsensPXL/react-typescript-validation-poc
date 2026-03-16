import {
  runValidationBenchmarks,
  type BenchmarkMode,
  type DatasetProfile,
} from '../src/bench/validationBenchmark';

async function main(): Promise<void> {
  const size = 10_000;
  const runs = 15;
  const modes: BenchmarkMode[] = ['detailed-errors', 'fast-boolean'];
  const profiles: DatasetProfile[] = ['both', 'random-mix'];
  const invalidRate = 0.25;

  console.log('Validation Benchmark (single process, local machine)');
  console.log('Interpret relatively: use these numbers to compare libraries, not as absolute throughput.');

  for (const mode of modes) {
    console.log(`\nMode: ${mode}`);
    console.log('-'.repeat(6 + mode.length));

    for (const profile of profiles) {
      const scenarios = await runValidationBenchmarks({
        size,
        runs,
        mode,
        profile,
        invalidRate,
      });

      console.log(`\nDataset profile: ${profile}`);
      console.log('-'.repeat(17 + profile.length));

      for (const scenario of scenarios) {
        const rows = scenario.rows
          .slice()
          .sort((a, b) => a.avgUsPerItem - b.avgUsPerItem)
          .map((row) => ({
            Validator: row.validator,
            'accuracy %': (row.accuracy * 100).toFixed(2),
            F1: row.f1.toFixed(3),
            'false accept %': (row.falseAcceptRate * 100).toFixed(2),
            'false reject %': (row.falseRejectRate * 100).toFixed(2),
            'avg ms/run': row.avgMsPerRun.toFixed(3),
            'avg us/item': row.avgUsPerItem.toFixed(3),
            'elapsed ms': row.elapsedMs.toFixed(2),
            'pass count': row.passCount,
          }));

        const title = `${scenario.title} (${scenario.size.toLocaleString()} records, ${scenario.runs} runs)`;
        console.log(`\n${title}`);
        console.log('='.repeat(title.length));
        console.table(rows);
      }
    }
  }
}

void main();
