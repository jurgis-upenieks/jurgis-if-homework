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
They cover the repository's server request isolation and browser client reuse,
the global overlay's combined query and mutation activity, and its custom logic
for keeping search editable while blocking and restoring other controls.
Catalogue tests cover uncached server retrieval and validation, the inclusive
discount threshold, global ranking, server-rendered first-page data, JSON page
requests, title-only search across pages, pagination boundaries, cancellation,
fresh data on revisits, immediate form submission, empty and recoverable error states.
Header tests cover navigation destinations, current-page indicators, and access without a menu button.
Update tests cover pushed deployment events, absence of periodic requests, idle and offline deferral,
pending saves and selected files, snapshot failures, compatible state additions, global cache restoration, implicit semantic scroll and focus recovery, ambiguous controls,
and reload throttling. Streaming tests cover immediate delivery, reconnection after
deployment errors, and connection cleanup.
Deployment checks also compare page and endpoint versions.
The test configuration maps Next.js's `server-only` marker to its bundled empty
module so server helpers can be exercised alongside the browser components.
Health checks cover the
uncached, external-service-independent deployment endpoint. Packaging tests cover
the standalone server, browser assets, excluded environment files, stale output,
and incomplete builds. Optional deployed-app
checks verify server-rendered products and browser assets; see
[DEPLOYMENT.md](../DEPLOYMENT.md) for `DEPLOYMENT_URL` usage.

Unit tests must exercise actual repository code and protect behavior worth
maintaining. Importing a repository wrapper alone does not make a test worthwhile.
Exclude library defaults, native browser behavior, trivial prop forwarding,
source formatting, simulated CSS layout, and duplicated assertions. Test fixtures
should only supply inputs to repository behavior, never become the behavior under
test. Check responsive sizing in a real browser.

The `@/` alias points to `../Homework.Web` in both Vite and TypeScript.
Dependencies resolve from the test project's installation. Vite deduplicates
React, React DOM, Next.js, Zustand, TanStack Query, and the existing UI dependencies
so tests and application code use the same library instances when both projects
have dependencies installed.

Keep tested library versions aligned with `Homework.Web` when upgrading.
When testing application code that imports another runtime dependency, add it
to this project and to `resolve.dedupe` in `vite.config.ts` as needed.
