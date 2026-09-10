# Homework.Web.Tests recreation command transcript

Executed on September 10, 2026. This is a record of this recreation, including
inspection commands and the rejected deletion attempt. Temporary paths belong
to this session; the README contains the normal installation commands.

The old project remains backed up at:

`/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests`

Each block gives the working directory followed by the exact submitted shell
command. Commands submitted together for independent reads may run concurrently.

## 1. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

````bash
pwd && git status --short && cat ../AGENTS.md
````

## 2. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

````bash
rg --files --hidden -g '!node_modules' -g '!.next' -g '!.git' -g '!package-lock.json' ../Homework.Web.Tests . && cat ../Homework.Web.Tests/package.json ../Homework.Web.Tests/vitest.config.mts ../Homework.Web.Tests/tsconfig.json ../Homework.Web.Tests/eslint.config.mts ../Homework.Web.Tests/.gitignore ../Homework.Web.Tests/README.md
````

## 3. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

````bash
cat ../Homework.Web.Tests/query-client.test.ts ../Homework.Web.Tests/store-context.test.ts ../Homework.Web.Tests/types.ts package.json lib/query-client.ts lib/create-store-context.tsx components/query-provider.tsx docs/state-management.md && cat node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md
````

## 4. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

Rejected before execution: rm -f style commands are not permitted. Replaced by moving the directory to a backup.

````bash
set -e
task_tests_backup=$(mktemp -d "${TMPDIR:-/tmp/}homework-tests-before-template.XXXXXX")
rsync -a --exclude=node_modules --exclude=.vitest ../Homework.Web.Tests/ "$task_tests_backup/"
rm -rf -- ../Homework.Web.Tests
printf '%s\n' "$task_tests_backup"
````

## 5. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

````bash
set -e
task_tests_backup=$(mktemp -d "${TMPDIR:-/tmp/}homework-tests-before-template.XXXXXX")
mv ../Homework.Web.Tests "$task_tests_backup/Homework.Web.Tests"
printf '%s\n' "$task_tests_backup/Homework.Web.Tests"
````

## 6. Command

Working directory: `/Users/afla/source/jurgis-if-homework`

````bash
npx --yes giget@latest gh:vitest-dev/vitest/examples/basic Homework.Web.Tests
````

## 7. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web.Tests`

````bash
rg --files --hidden . && cat package.json tsconfig.json vite.config.ts README.md && find src test -type f -maxdepth 3 -exec cat {} +
````

## 8. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web.Tests`

````bash
set -e
mv src '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/starter-src'
mv test '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/starter-test'
mkdir test
cp '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/query-client.test.ts' '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/store-context.test.ts' '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/types.ts' test/
cp '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/tsconfig.json' '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/eslint.config.mts' '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/.gitignore' .
cat > vite.config.ts <<'EOF'
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: { "@": fileURLToPath(new URL("../Homework.Web", import.meta.url)) },
    dedupe: ["react", "react-dom", "zustand", "@tanstack/react-query"],
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
  },
});
EOF
npm pkg set name=homework.web.tests version=0.1.0 'engines.node=>=24' 'scripts.test=vitest run' 'scripts.test:watch=vitest' 'scripts.lint=eslint .' 'scripts.typecheck=tsc --noEmit' 'scripts.build=npm run lint && npm run typecheck'
npm pkg delete main license stackblitz 'scripts.test:ui' 'scripts.test:run' 'devDependencies.@vitest/ui'
npm pkg set 'devDependencies.react=19.2.8' 'devDependencies.react-dom=19.2.8'
npm install --save-dev vitest@^5 vite@^8 typescript@^5 jsdom@^30 @testing-library/react@^16 @types/node@^24 @types/react@^19 @types/react-dom@^19 zustand@^5.0.15 @tanstack/react-query@^5.102.8 eslint@^10 @eslint/js@^10 typescript-eslint@^8 jiti@^2
````

## 9. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web.Tests`

````bash
cat > README.md <<'EOF'
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

Use Node.js 24 or newer. Keep `Homework.Web.Tests` and `Homework.Web` next to each
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
and shared queries, plus Zustand provider isolation, state retention, selector
subscriptions, and missing-provider errors.

The `@/` alias points to `../Homework.Web` in both Vite and TypeScript.
Dependencies resolve from the test project's installation. Vite deduplicates
React, React DOM, Zustand, and TanStack Query so tests and application code use
the same library instances when both projects have dependencies installed.

Keep tested library versions aligned with `Homework.Web` when upgrading.
When testing application code that imports another runtime dependency, add it
to this project and to `resolve.dedupe` in `vite.config.ts` as needed.
EOF
npm ci && npm test
````

## 10. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

The copy succeeded; npm ci with --prefix to the temporary path failed. Running npm ci directly in that copied project then succeeded and all eight tests passed.

````bash
set -e
task_tests_isolated=$(mktemp -d "${TMPDIR:-/tmp/}homework-tests-template-isolated.XXXXXX")
rsync -a --exclude=node_modules --exclude=.next ./ "$task_tests_isolated/Homework.Web/"
rsync -a --exclude=node_modules --exclude=.vitest ../Homework.Web.Tests/ "$task_tests_isolated/Homework.Web.Tests/"
printf '%s\n' "$task_tests_isolated"
npm --prefix "$task_tests_isolated/Homework.Web.Tests" ci
npm --prefix "$task_tests_isolated/Homework.Web.Tests" test
````

## 11. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

````bash
cat ../Homework.Web.Tests/package.json /var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-template-isolated.PapEaO/Homework.Web.Tests/package.json && rg -n 'Homework.Web.Tests|workspaces|file:' ../Homework.Web.Tests/package-lock.json /var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-template-isolated.PapEaO/Homework.Web.Tests/package-lock.json
````

## 12. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

````bash
rg -n 'argv|cwd|Missing|verbose title|verbose stack' /Users/afla/.npm/_logs/2026-09-10T10_12_53_336Z-debug-0.log
````

## 13. Command

Working directory: `/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-template-isolated.PapEaO/Homework.Web.Tests`

````bash
npm ci && npm test
````

## 14. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

````bash
npm --prefix ../Homework.Web.Tests ci
````

## 15. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

````bash
git status --short -- ../Homework.Web.Tests
git diff --stat -- ../Homework.Web.Tests
cat ../Homework.Web.Tests/package.json ../Homework.Web.Tests/vite.config.ts ../Homework.Web.Tests/tsconfig.json ../Homework.Web.Tests/eslint.config.mts ../Homework.Web.Tests/.gitignore ../Homework.Web.Tests/README.md
cmp '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/query-client.test.ts' ../Homework.Web.Tests/test/query-client.test.ts
cmp '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/store-context.test.ts' ../Homework.Web.Tests/test/store-context.test.ts
cmp '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/types.ts' ../Homework.Web.Tests/test/types.ts
cmp '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/tsconfig.json' ../Homework.Web.Tests/tsconfig.json
cmp '/var/folders/cg/gfly7_3935xbd94l0g7w0_500000gn/T/homework-tests-before-template.i7wBcs/Homework.Web.Tests/eslint.config.mts' ../Homework.Web.Tests/eslint.config.mts
node --input-type=module <<'NODE'
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const project = "../Homework.Web.Tests/";
const manifest = JSON.parse(readFileSync(project + "package.json", "utf8"));
const lock = JSON.parse(readFileSync(project + "package-lock.json", "utf8")).packages[""];
for (const key of ["name", "version", "devDependencies", "engines"]) {
  assert.deepEqual(manifest[key], lock[key]);
}
assert.deepEqual(readdirSync(project + "test").sort(), ["query-client.test.ts", "store-context.test.ts", "types.ts"]);
console.log("Manifest matches lockfile; application tests match the backup; demo tests are absent.");
NODE
````

## 16. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

Staging succeeded. The diff check found an extra blank line at the end of this transcript; that formatting was corrected before retrying.

````bash
git add -- ../Homework.Web.Tests && git diff --cached --check -- ../Homework.Web.Tests && git status --short -- ../Homework.Web.Tests && git diff --cached --stat -- ../Homework.Web.Tests
````

## 17. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web`

````bash
git add -- ../Homework.Web.Tests && git diff --cached --check -- ../Homework.Web.Tests && git status --short -- ../Homework.Web.Tests && git diff --cached --stat -- ../Homework.Web.Tests
````

## 18. Command

Working directory: `/Users/afla/source/jurgis-if-homework/Homework.Web.Tests`

````bash
npm run build 2>&1
````

## Direct file edits

After npm installed the dependencies, this formatting-only patch compacted the
single-property engines object. It was applied with the file-editing tool,
not a shell command. This transcript itself was also written with that tool.
All other configuration changes and README content appear in the shell commands
above, and the existing tests and shared configurations were copied from backup.

````diff
*** Begin Patch
*** Update File: /Users/afla/source/jurgis-if-homework/Homework.Web.Tests/package.json
@@
-  "engines": {
-    "node": ">=24"
-  }
+  "engines": { "node": ">=24" }
*** End Patch
````
