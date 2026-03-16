import {
  runValidationBenchmarks,
  type BenchmarkMode,
  type DatasetProfile,
} from '../src/bench/validationBenchmark';

async function main(): Promise<void> {
  const size = 10_000;
  const runs = 15;
  const modes: BenchmarkMode[] = ['detailed-errors', 'fast-boolean'];
  const profile: DatasetProfile = 'both';

  console.log('Validation Benchmark (single process, local machine)');
  console.log('Interpret relatively: use these numbers to compare libraries, not as absolute throughput.');

  for (const mode of modes) {
    console.log(`\nMode: ${mode}`);
    console.log('-'.repeat(6 + mode.length));

    const scenarios = await runValidationBenchmarks({
      size,
      runs,
      mode,
      profile,
    });

    for (const scenario of scenarios) {
      const rows = scenario.rows
        .slice()
        .sort((a, b) => a.avgUsPerItem - b.avgUsPerItem)
        .map((row) => ({
          Validator: row.validator,
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

void main();
