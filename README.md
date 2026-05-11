# Validator Comparison POC (React + TypeScript)

This project compares popular validation approaches for a shared domain model (slaughter record input) in a React + TypeScript application.

Current domain model note:
- `type` is validated as one of: `male`, `female`, `child`, `steralised male`

It focuses on three questions:
- Which libraries produce correct results consistently?
- How do they behave on valid vs invalid input?
- Which one is the best fit for this app context?

## Libraries Compared

| Library | Category | Notes |
|---|---|---|
| TypeScript-only | Static typing | Compile-time only, no runtime guard |
| Zod | Runtime schema | Strong DX and TS integration |
| Yup | Runtime schema | Mature fluent API |
| Superstruct | Runtime schema | Composable and lightweight |
| Typanion | Predicate-based | Very fast runtime checks |
| AJV | JSON Schema validator | Standards-based and API friendly |
| Joi | Object schema validator | Very expressive for complex rules |

## Backend Integration (MSW)

This POC now includes **Mock Service Worker (MSW)** that accurately simulates the VasamaAPI backend, including:

- **Backend-accurate DTOs** with PascalCase property names and type quirks (string IDs, optional fields)
- **Real endpoints** for authentication, RH cooperatives, slaughter events, and more
- **Integration tests** verifying that frontend code can parse backend responses correctly
- **Mapper examples** showing how to convert backend DTOs to frontend domain models

See [src/mocks/README.md](src/mocks/README.md) for details on the mock server setup and how to add new endpoints.

Run tests with `npm test` to verify backend compatibility across all validation approaches.

## Quick Start

```bash
npm install
npm run dev
```

Useful commands:

```bash
# Unit tests
npm run test

# Benchmarks
npm run bench:validation

# Structured per-case report (JSON + CSV)
npm run report:validation

# Production build
npm run build
```

## Structured Test Report Export

To produce thesis-ready tables from the same validation cases used in the UI, run:

```bash
npm run report:validation
```

This generates two export files in `reports/`:
- `validation-case-report.json`
- `validation-case-report.csv`

Each row is one test case x one library and includes:
- case label and description
- expected validity and actual pass/fail
- whether the library caught or missed the invalid case
- error count and full error messages
- average duration per case (`avgDurationMs` and `avgDurationUs`)

You can increase timing stability by repeating each case more times:

```bash
npx tsx scripts/validation-case-report.ts --reps=100
```

## Where Things Live

```text
src/
  components/       # Interactive demos, dashboard, analysis UI
  schemas/          # Runtime schema implementations for all compared libraries
  bench/            # Benchmark orchestration and adapters
  __tests__/        # Unit tests and fuzz comparison tests
  types/            # Shared TypeScript domain types
scripts/
  validation-benchmark.ts
  validation-case-report.ts
```

## Domain-Specific Validation Cases

In addition to randomized fuzz data, the POC now includes explicit reindeer husbandry invalid submissions:
- carcass weight of `0`
- negative animal count
- slaughter date in the future
- wrong ear-tag / record ID format (expected `SL-YYYY-NNN`)
- invalid animal `type` value (for example `unknown`)

These domain cases are used in shared test cases, benchmark invalid generation, and comparison tests.

## Exact Error Output Comparison

The Analysis tab includes an "Exact Error Output Comparison" panel.

For one selected invalid input, it displays each library side-by-side with:
- accept or reject result
- exact raw error messages returned by that library

This gives directly citable material for thesis sections discussing error quality and message clarity.

## Methodology

The comparison combines four signals:
- Correctness: mismatch rate under randomized fuzz cases
- Domain validity: deterministic real-world invalid submissions from the target business context
- Performance: average microseconds per item for valid and invalid records
- Error quality: field-level diagnostics and actionable messages
- Developer experience: TypeScript ergonomics and schema maintainability

Important interpretation note:
- Consistency ratio is useful for understanding valid/invalid path spread, but absolute latency still matters more for practical impact.

## Results Summary

### Correctness

- Runtime validators achieved 0% mismatches in fuzz comparison for this schema set.
- Correctness does not meaningfully separate these libraries in this POC.

### Performance

- Typanion is the fastest runtime option in this benchmark suite.
- Zod and AJV are slower on invalid paths because they produce richer diagnostic output.
- All compared runtime libraries are fast enough for common UI and API workloads in this project.

### Diagnostics and UX

- Zod and Joi provide rich, developer-friendly error reporting.
- AJV is strongest when JSON Schema interoperability is a requirement.
- Typanion is efficient, but built-in error output is less field-oriented for analysis dashboards.

## Decision Matrix (How "Best" Is Represented)

There is no universal winner. The best choice depends on project priorities.

For this React + TypeScript UI-focused POC, we use weighted criteria:
- Developer experience: 30%
- TypeScript integration: 25%
- Error quality and field diagnostics: 20%
- Performance: 15%
- Ecosystem and maintainability: 10%

Weighted score formula:

$$
	ext{Total} = \sum_i (\text{weight}_i \times \text{score}_i)
$$

Outcome for this project context:
- Overall recommendation: Zod
- Best for JSON Schema and API contracts: AJV
- Best for raw runtime speed: Typanion
- Best for complex enterprise-style rule sets: Joi

## Practical Recommendation

If you are building a React form-heavy app with TypeScript, start with Zod.

Choose AJV when schema portability and standards compliance matter most.
Choose Typanion when maximum throughput is the top constraint.
Choose Joi when advanced conditional validation complexity is the primary concern.

## Validation Scope and Quality Signals

- Test suite includes unit tests per validator, cross-library fuzz validation, and deterministic domain-case comparisons.
- Current test run status: passing.
- Benchmark conclusions should be treated as comparative signals, not absolute hardware-independent truths.
