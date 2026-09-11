# AI coding agent guideline rules

## 1. Code quality:
- 1.1. Code needs to be tuned to be easily readable specifically by HWLMC (stands for Humans With Limited Mental Capacity).
- 1.2. The structuring of code needs to be tuned specifically for HWLMC easy comprehension.
- 1.3. When HWLMC will be reading through the entirety of this code, for HWLMC specifically, it should not be like going through a maze - there needs to be a consistent directionality when reading the full code, and no unnecessary jumping to different code parts/fragments when reading the code. The front-end code (at any scope and at any abstraction level) should not be tangled up for HWLMC comprehension. So it is STRICTLY FORBIDDEN to write tangled-up or maze-like code from the perspective of HWLMC.
- 1.4. Too much fragmentation, choppiness, separation of code parts is not allowed, because too much of it makes harder specifically for HWLMC to comprehend the full picture of code. It should be made easy for HWLMC to comprehend the full picture of code, so code separation should be reserved only to where it's really needed for code reusability.
- 1.5. Organization, structuring, and naming of the code files, modules, and the code should be up to the latest year 2026 professional standards in react next.js projects;
- 1.6. Not cause any functional and visual regressions in the touched parts and anywhere throughout the rest of the app;
- 1.7. Removing unused code;
- 1.8. Code MUST be clean, simple, not over-engineered, not over-complicated, not unnecessarily inflated, no boilerplate.
- 1.9. When property drilling starts to cause unnecessary boilerplate, where using Zustand stores/state-management would reduce that code size, in that case it is STRICTLY FORBIDDEN to use property drilling, and should use (or switch to) Zustand instead. But in cases, when Zustand would cause more code than property drilling (and only in such cases), need to stick with property drilling (but property drilling should be only reserved to those rare cases).
- 1.10. For managing data retrieval from back-end and external services (API responses, loading/error states, caching, background refresh, mutations and other similar stuff) use TanStack Query.
- 1.11. Removing code comments from your code changes, and instead the code should be implemented in self-documenting way.
- 1.12. Need to use the reusable components solution shadcn/ui + Base UI. If the shadcn/ui + Base UI doens't provide something, need to wrap, extend, override, etc.

## 2. MUST use TypeScript instead of plain JavaScript:
- 2.1. For example, specifying `any` for types is not allowed, and is reserved only to very rare cases, where there is really no other more proper alternative.
- 2.2. MUST NOT use plain javascript. Instead MUST use typescript and latest ECMAScript features and built-ins instead of manual/custom implementation.

## 3. Project‑wide consistency:
- 3.1. MUST inspect the entire project, before adding or changing code, to identify the already established approach/pattern for what needs to be changed and follow the established approach/pattern. And, if researching for already established approach in the project, you find multiple different approach for implementing the same type of stuff, prioritize the most recently implemented one. It is STRICTLY PROHIBITED to "reinvent the wheel" if in the project or in dependencies there is already a solution available/implemented. And also it is STRICTLY PROHIBITED to keep implementations for multiple similar solutions, where instead they should be consolidated, merged, generalized into one solution, and made configurable for multiple use-cases. And, instead of creating similar multiple solutions, need to upgrade the existing one + configurable/parametrized. It is strictly forbidden to violate this rule.
- 3.2. MUST NOT mix different approaches across files or components, use what is already established throughout the project.

## 4. MUST separate code in 2 parts, where first half as compact configuration-only/parameterized-only instantiation (configuring/paremterizing the instance only for the business-specific use-case) should go into the project business-specific parent components (everything that is not `Homework.Web/generic-configurables/`), and other half as reusable and generic and business-usecase-non-specific and universal and configurable/parameterized implementation should go into the reusable stuff module `Homework.Web/generic-configurables/`:
- 4.1. MUST NOT put actual implementation in places other than `Homework.Web/generic-configurables/`. Instead, the actual implementation MUST go only in the reusable stuff module `Homework.Web/generic-configurables/` in the appropriate exising component there, or if there is no existing component there to upgrade, only in that case create a new one there in a reusable and generic and business-usecase-non-specific and universal and configurable/parameterized way.
- 4.2. Elsewhere that is not `Homework.Web/generic-configurables/`, MUST add only compact configuration/arguments with the specific business case specifics or configuration to override defaults (and only if the defaults should be overridden), and pass that business-case-specific configuration to the module `Homework.Web/generic-configurables/` component.

## 5. API interface/contract (including its full structure) of components, composables, services, modules, functions:
- 5.1. MUST NOT in any way create a dirty, fragmented, human-unfriendly, boilerplated, bloated API interface/contract (including its full structure) of components, composables, services, modules, functions.
- 5.2. MUST NOT in any way fragment/separate the API interfaces/contracts (including its full structure) into multiple parts, where the only exception is where it is really necessary for real/actual reusability or/and to reduce code repetition.
- 5.3. MUST NOT in any way overengineer the API interfaces/contracts (including its full structure).
- 5.4. The API interface/contract (including its full structure) of components, composables, services, modules, functions MUST be as clean, simple, human-friendly, short, compact, as possible.
- 5.5. The API interface/contract (including its full structure) of components, composables, services, modules, functions MUST be made in a way to have as minimal necessary configuration/arguments code on the usage/parent side as possible, for example by inferring things at the child/callable side and by using default values (most common accross parents/callers) in the API interface/contract (including its full structure), and by not exposing (and removing) in the API interface/contract (including its full structure) stuff that is common to all parents/callers, and use other appropriate approaches for the contract/interface so that the configuration/arguments code size on the parent/caller side is as simple and minimal and compact and distilled and pure as possible, while also still adhering to rule #1.

## 6. Parent/caller/usage/argument/configuration side of the API interface/contract of components, composables, services, modules, functions:
- 6.1. On the Parent/caller/usage/argument/configuration side of the API interface/contract of components, composables, services, modules, functions MUST NOT in any way fragment/separate the configuration/arguments code into multiple parts, where the only exception is where it is really necessary for real/actual reusability or/and to reduce code repetition.

## 7. Styling:
- 7.1. All styling should be used from the Tailwind css classes system.
- 7.2. MUST NOT write custom styles, but only what is already provided by Tailwind system.
- 7.3. In styling code for spacing between elements MUST NOT use paddings and margins. Instead, MUST use `gap` spacings approach.
- 7.4. In styling code MUST NOT use direct hard-coded color codes, sizes, fonts, and other hardcoded stuff, but instead MUST use theme variables, preferably picking from the already available ones.
- 7.5. In styling code MUST NOT use direct css style attributes, but instead MUST use `@apply` approach.
- 7.6. Layout should be 100% responsive - looking good and usable on any size and aspect ratio screens and touch screens.
- 7.7. Never hard-code any spaces (inner, outer, in-between) and sizes, but only use the fully dynamic responsive custom standardized centralized css 'clamp' function system.

## 8. Templates:
- 8.1. MUST NOT make a div-soup, div-soup is not allowed.
- 8.2. Templates MUST use only the most contextually semantically appropriate elements and in the most appropriate structure/hierarchy.
- 8.3. Prefer semantic input-to-action: use form submission, not ad‑hoc key handling, so Enter triggers the primary action while preserving accessibility and focus.
- 8.4. When asked to refecator/rework, preserve original effective layout on semantic refactors - when replacing a layout container with a more hierarchically semantic approach, keep the previous effective width/height, padding, alignment and grow/shrink behavior in all known usages unless the task explicitly calls for a visual change.

## 9. Code style:
- 9.1. Code indentation tab size (each indentation level) should be 2 spaces.
- 9.2. Code line length MUST NOT be larger than 200 symbols (including white space symbols and all other types of symbols).
- 9.3. If there is just one item inside {} or [] or (), MUST NOT inflate the code by putting that item inside a new line and curly braces in their own lines (it should be on the same line).
- 9.4. For code new line symbol, MUST use only LF `\n`. MUST NOT use CRLF `\r\n`, CR `\r`, or any other types of new line formats.
- 9.5. There MUST NOT be more than 1 empty lines sequentially.

## 10. Structuring of component file code:
- 10.1. MUST saparate out internal and public types of a component into separete file `types.ts`, which should be located next to the component file. MUST NOT put types of a component into the component file itself. In the `types.ts` file first there should be public types, then 2 empty lines, and then private types. Only public types should be exported for external usage. Internal types should be made internally available only.
- For stuff, which is fitting to go into the server-side, it SHOULD BE put in the server-side code.

## 11. Minimalism; prefer built‑ins over custom:
- 11.1. MUST avoid boilerplate and custom implementations when a built‑in exists.
- 11.2. When trying to explore built-in ways, don't add additional external dependencies/libraries, but instead rely on already available dependencies/libraries.
- 11.3. MUST prefer concise built‑in professional patterns over custom implementation.
- 11.4. If it cannot be achieved with built‑ins, MUST rework the layout/structure to enable using built-ins but only to the really necessary extent.

## 12. Code file naming:
- 12.1. Code file names `index.ts` and `index.tsx` are reserved only for files specifying module's public interface/API. And the interface/API files should not expose stuff used only internally in that module.
- 12.2. MUST NOT use `index.ts` and `index.tsx` file names for code files that contain the actual implementation.

## 13. Cleanup after changes:
- 13.1. After making changes, in new code only, always additionally MUST considerably reduce boilerplate and clean up by leveraging built‑ins and already available infrastrucure/components over custom implementation, while still keeping what is really needed functionally and visually.

## 14. Prevent regressions:
- 14.1. When making changes MOST make sure that they will not cause any regressions around the project, that they will not break existing functionality in other pages and in other components.
- 14.2. Also, after making changes, MUST again double-check if they did not cause any regressions around the project, that they didnt break existing functionality in other pages and in other components.

## 15. Code comments aren’t allowed – MUST NOT write any code comments in new changes, where instead MUST convey intent via clear, self‑descriptive, self-documenting code, following "good human-readable code is the best documentation" approach.

## 16. Avoid bad, unsafe approaches:
- 16.1. MUST NOT use dangerouslySetInnerHTML, but resort to safer and more professional alternatives.
- 16.2. MUST NOT directly change generated or unversioned files.
- 16.3. For string enum types use a safe approach, for example:
```
const roles = ['admin', 'user'] as const;
type Role = typeof roles[number];
```

## 17. When asked to fix a bug:
- 17.1. MUST do your best, investigate very carefully, thoughtfully and very wide and very deep, and make sure to not cause any functional or visual regressions in the touched parts and anywhere throughout the rest of the site where the touched parts are directly or indirectly used.

## 18. For functionality in Homework.Web, MUST create and maintain unit-tests, which should be put in Homework.Web.Tests.

## 19. All template/layout should be 100% accessibility compliant! 

## 20. When making changes, MUST NOT revert/undo the existing local uncommitted changes.

## 21. MUST NOT rely on build and lint commands for determining if your changes introduced regressions (such corner-cutting is not allowed). Instead, when checking if your changes introduced regressions, MUST perform a proper code analysis (actually analyzing directly and indirectly related code) to determine if any visual or functional regressions have been introduced. And must be truly fully thorough to cover all the directly and indirectly related code, and must inspect all that code truly very closely and very carefully. Before doing rule #22, MUST always do this rule (#21) and never skip it.

## 22. MUST NOT run build or lint commands in-between making fragments of changes while fulfilling a user prompt (basically running build and lint commands is not allowed after each code-changes step)! Only after making all the changes for a particular user prompt, MUST check for each touched project if there are any lint errors and build errors (both operations combined by running a single command `npm run build 2>&1` for each touched project, that runs both lint checks and build checks) and fix them (so basically there can be only a single build and lint run for each touched project for each user prompt, which can be only at the very end of fulfilling a user prompt). The only exception when that command is allowed to be run more than 1 time per prompt, is when the first run of the command reported errors, then, after agent finished fixing those errors, it is allowed (and only in that case) to run the command again to verify if the errors are no longer reported. But running build+lint command should not be used for determining if regressions have been introduced (for that refer to rule #21).

## 23. After performing rule #22, if it reports no errors, don't perform any further code analysis, code diffing, git status, no summary/report of changes, or anything else, just end the user prompt.
