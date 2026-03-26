# Validator Comparison POC (React + TypeScript)

This project compares popular validation approaches for a shared domain model (slaughter record input) in a React + TypeScript application.

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

# Production build
npm run build
```

## Where Things Live

```text
src/
  components/       # Interactive demos, dashboard, analysis UI
  schemas/          # Zod, AJV, and Joi schema implementations
  bench/            # Benchmark orchestration and adapters
  __tests__/        # Unit tests and fuzz comparison tests
  types/            # Shared TypeScript domain types
scripts/
  validation-benchmark.ts
```

## Methodology

The comparison combines four signals:
- Correctness: mismatch rate under randomized fuzz cases
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

- Test suite includes unit tests per validator plus cross-library fuzz validation.
- Current test run status: passing.
- Benchmark conclusions should be treated as comparative signals, not absolute hardware-independent truths.
