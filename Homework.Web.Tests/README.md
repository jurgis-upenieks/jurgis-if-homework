# Homework.Web.Tests

Standalone unit tests for `Homework.Web`, bootstrapped from the
[official Vitest basic example](https://github.com/vitest-dev/vitest/tree/main/examples/basic)
using [Giget](https://github.com/unjs/giget).

## Bootstrap

The project was recreated from the repository root with:

```bash
npx --yes giget@latest gh:vitest-dev/vitest/examples/basic Homework.Web.Tests
```

The previous directory was moved to a temporary backup first. The starter's
demonstration source and tests were replaced by the existing application tests.
Its `vite.config.ts` was configured for jsdom and the sibling application;
TypeScript, ESLint, and dependency versions were aligned with the standalone
test setup. The configuration and test files still require these adaptations
after downloading the generic starter.

[COMMANDS.md](COMMANDS.md) records every shell command used for this recreation,
including dependency installation, configuration changes, validation, and staging.

## Install and run

Use Node.js 24.2 or later within version 24. Keep `Homework.Web.Tests` and `Homework.Web` next to each
other in the repository. Only the sibling application's source is needed;
the test project owns its dependencies and does not need an application
installation, build, or running server.

From this directory:

```bash
npm ci
npm test
npm run build
```

`npm test` runs the tests once. `npm run test:watch` watches for changes.
`npm run build` runs ESLint and TypeScript checks without generating build files.
The checks can also run separately with `npm run lint` and `npm run typecheck`.

From the repository root:

```bash
npm --prefix Homework.Web.Tests ci
npm --prefix Homework.Web.Tests test
npm --prefix Homework.Web.Tests run build
```

## Tests and dependency resolution

Application tests live in `test/` as `*.test.ts` or `*.test.tsx`.
They cover TanStack Query cache isolation, browser cache reuse, provider stability,
shared queries, and the automatic global loading overlay across concurrent queries,
mutations, background refreshes, retries, failures, and cancellations, plus modal
focus management, dismissal prevention, and restored interaction afterward. They also
cover Zustand provider isolation, state retention, selector
subscriptions, and missing-provider errors.
Shared control tests cover native form submission, disabled actions, input labels,
refs and values, semantic cards, and application provider defaults.
Catalogue tests cover uncached server retrieval and validation, the inclusive
discount threshold, global ranking, server-rendered first-page data, JSON page
requests, title-only search across pages, pagination boundaries, cancellation,
fresh data on revisits, empty and recoverable error states, and mobile navigation controls.
The test configuration maps Next.js's `server-only` marker to its bundled empty
module so server helpers can be exercised alongside the browser components.
Health checks cover the
uncached, external-service-independent deployment endpoint. Packaging tests cover
the standalone server, browser assets, excluded environment files, stale output,
and incomplete builds. Optional deployed-app
checks verify server-rendered products and browser assets; see
[DEPLOYMENT.md](../DEPLOYMENT.md) for `DEPLOYMENT_URL` usage.

The `@/` alias points to `../Homework.Web` in both Vite and TypeScript.
Dependencies resolve from the test project's installation. Vite deduplicates
React, React DOM, Next.js, Zustand, TanStack Query, and the existing UI dependencies
so tests and application code use the same library instances when both projects
have dependencies installed.

Keep tested library versions aligned with `Homework.Web` when upgrading.
When testing application code that imports another runtime dependency, add it
to this project and to `resolve.dedupe` in `vite.config.ts` as needed.
