# 1. Initial empty project creation and repository creation commands
 - First things first, I updated my NodeJS version to latest stable to get the latest security patches for node and npm, which is especially important nowadays to update as frequently as possible, mainly to avoid being hacked by AI cyberattackers.
 - `cd ~/source`
 - `mkdir jurgis-if-homework`
 - `cd jurgis-if-homework`
 - `npx --yes create-next-app@latest homework.web`
 - `mv homework.web Homework.Web`
 - `git init`
 - `git rm --cached -f -- Homework.Web`
 - `mv Homework.Web/.git .git/embedded-repositories/Homework.Web.git`
 - `git add .`
 - `git commit -m ‘Initial’`
 - `git branch -M main`
 - `git remote add origin git@github.com:jurgis-upenieks/jurgis-if-homework.git`
 - `git remote set-url origin git@github.com:jurgis-upenieks/jurgis-if-homework.git`
 - `git push origin main`

# 2. Integrating tailwind-friendly reusable UI components library combo: shadcn/ui + Base UI
 - `cd Homework.Web`
 - `npx --yes shadcn@latest init --base base --defaults --yes`
 - `npx --yes shadcn@latest add button card input label dialog --yes`
 - `npm install next-themes`

# 3. Integrating Zustand state management solution into the project to avoid property drilling
 - `npm install zustand`
 - Zustand stores keep resumable search, pagination, and menu state available to the shared application updater without property drilling.

# 4. Integrating TanStack Query solution for managing data retrieval from back-end and external services
 - `npm install @tanstack/react-query`

# 5. Making Homework.Web.Tests a stand-alone, self-contained unit tests project for testing functionality of Homework.Web
 - `mkdir Homework.Web.Tests`
 - `cd Homework.Web.Tests`
 - `npx --yes giget@latest gh:vitest-dev/vitest/examples/basic .`
 - `npm i`

# 6. Agentic coding
 - Everywhere, where in this project the Codex was used, it adhered to the custom guideline rules AGENTS.md. You can view the rules in that file.
 - The custom guideline rules enforce the code quality and so that it remains maintainable for the long term.
 - I am using the 113 EUR monthly codex plan with GPT-6 Astra XHigh effort mode.
 - I am doing extra re-validation with the Critic in a loop.

# 7. A full-stack app
- The products list is paginated, so for each page only the needed products list data needs is retrieved from the server-side. When a user first opens the site and gets in to the first page of the products list, a server-side rendering is already putting all data visually in that page before sending to client-side. And also, for hydration to work, in the rendered page matadata it includes a json with the data for models. Then after, the client-side gets that page with all the data already populated in the dom, it starts hydration silently in the background to transition from a static page to a Single Page Application full app mode. But when later, when a user decides to switch to another products list page, then the client-side requests from the server-side the data for the second page (not asking for a server-side-rendering of the second page, but requests only the data for the second page of products). Also, on the server-side, the server doesnt cache the products list, because on the external service, from which it gets the data, that data might change from time to time.

# 8. Deployed to production with Azure CI/CD
 - This full-stack app has been deployed to Azure cloud and the deployed version is publicly available at: https://jurgis-if-homework-f7fmdjdcfndsbqdu.germanywestcentral-01.azurewebsites.net
 - This is a full-stack Next.js app, and in Azure it has also the server-side running (for server-side-rendering and for responding to REST API requests from the client-side).
 - The deployment method in Azure is App Service Web App with:
   - Publish as: Code
   - Runtime stack: Node 24
   - Operating system: Linux
   - Region: Germany West Central
   - From Azure side I have created a custom manged github identity, and then from github side I have set up all the actions secrets variables with azure identities.
   - Then I triggered the first deployment to Azure from the Github Actions -> Run workflow.
   - From that point on, on every future git push to 'main' branch, that Github Actions workflow is triggered automatically.
 - I have configured the Azure pipelines, so that on every git-push to 'main' branch the following jobs are automatically triggered by Azure side: build, run unit-tests and deploy to production.
 - I have configured the pipelines so that the deployment to production is gated by unit-tests run.
 - The Azure CI/CD pipelines configuration is in: .github/workflows/azure-app-service.yml

# 9. Responsive and mobile-friendly front-end
 - My special signature when developing front-ends, is making fully dynamic responsive spaces (inner, outer, in-between) and sizes in layout with a custom standardized centralized css 'clamp' function system. This way the site contents are looking good and usable on any screen size and aspect ratio.
 - The layout is fully responsive - all layout parts shift and resize as needed.
 - When user is scrolling the page vertically, all parts except the page contents products list, stay in place (fixed) and are always visible. Only the products list can be scrolled vertically.
 - On both pages, the content scrollbar is at the far right of the site and starts at the site header's bottom edge. On the Products page it ends at the footer's top edge, excluding both the header and footer. On Technical details, which has no footer, it ends at the viewport bottom. The shared Base UI scroll area keeps the header, page title, search, and pagination in place while the content scrolls.
 - When the screen is too short to fit the controls, the document can scroll so the content region remains reachable instead of collapsing to zero height.

# 10. Meaningful unit tests
 - Unit tests in Homework.Web.Tests cover repository behavior, including retrieval, search, pagination, loading interaction, navigation, documentation, and packaging. Tests are maintained alongside functionality changes; the guidelines do not guarantee a coverage percentage.
 - Responsive layout is also checked in a real browser, and directly and indirectly related code is reviewed before the final build and lint checks.
 - To run all unit-tests, from the project root dir run `npm --prefix Homework.Web.Tests test`

# 11. Shared loading interaction
 - A half-transparent overlay automatically follows all active TanStack Query requests and mutations. It blocks other controls while the search field remains editable. Its spinner rotates continuously while the overlay fades in over 2 seconds and out over 0.1 second, including with reduced-motion preferences.
 - Search applies after 300 ms without typing, or immediately on form submission with Enter. Equivalent searches preserve the current page and scroll position. Clear cancels pending typing and returns to the first page.

# 12. I have configured the app so that the "Technical details" page is rendered only on build/compile-time, because it has a fully static content. The server-side-renderer is never bothered with re-rendering of that page. Also, it is always automatically fully reflecting the content of the root README.md, because at build-time it takes the texts from the that README.me.
 - This page renders the repository README directly during the build, keeping its content synchronized with this file.

# 13. Locally running or building the app
 - To build the app, from project root dir run command: `npm --prefix Homework.Web run build`
 - To run the app locally with live-reload, from the project root dir run command: `npm --prefix Homework.Web run dev`

# 14. The products filter has such features:
 - Live search while typing, but with a debounce of 300ms.
 - Can search by tokens, which:
   - Are separated by spaces;
   - Case-insensitive;
   - International character insensitive;
   - Order insensitive;

# 15. Technologies stack
 - TypeScript: strong types for product data and component configuration.
 - Node.js 24: runs the app server and deployment packaging; npm manages dependencies and scripts.
 - React and React DOM: for implementing custom components - product cards, search, pagination, mobile menu, and page hydration.
 - Next.js and App Router: for full-stack app, server-rendered products, static Technical details, and `/api/products` and `/health` endpoints.
 - Zustand: resumable component state for automatic application updates.
 - TanStack Query: product fetching, request errors, the shared loading overlay, and query-cache restoration.
 - DummyJSON supplies products; Fetch retrieves them server-side and calls `/api/products` client-side.
 - Tailwind CSS, PostCSS, and CSS Modules: responsive product and documentation layouts using theme and `clamp()` tokens.
 - shadcn/ui + Base UI: product cards, search input, pagination buttons, loading overlay, and scrollbars.
 - `next-themes`: applies the site theme, defaulting to light.
 - `cn`: combines shared component styles with catalogue styles.
 - ESLint and TypeScript checks: validate app and test code during builds.
 - Vitest, Vite, React Testing Library, and jsdom: test catalogue behavior, loading, documentation, and packaging.
 - Git and GitHub: version control.
 - GitHub Actions: tests, builds, Azure deployment from `main` via OIDC, and production checks.
 - Microsoft Azure App Service on Linux: hosts the Next.js pages and APIs.

# 16. Automatic application updates
 - Each production build embeds a unique version in the browser bundle, page metadata, and uncached `/api/version` endpoint, including builds that revert older code.
 - Each browser opens one native EventSource connection to `/api/version`. The server pushes its version immediately; clients do not periodically request version checks.
 - The current Azure deployment restarts the app. That closes old streams; EventSource reconnects automatically and receives the new server's version.
 - Server-side keepalive comments keep the stream active. These are not version checks. Offline and suspended devices resume when their connection is restored.
 - An update waits for 1.5 seconds without interaction, completed data requests and saves, finished text composition, released pointers, and no selected upload files.
 - After receiving a different version from a connected server, the updater saves a snapshot in that tab's session storage and reloads.
 - The snapshot restores search text, applied search, pagination, menu state, cached data models, page and content scroll positions, keyboard focus, and input text selection.
 - The address stays unchanged and the existing theme preference survives. Each tab keeps its own snapshot; snapshots are consumed after restoration and expire after 24 hours.
 - EventSource reconnects after connection loss; a stream stopped by a deployment HTTP error is reopened after a short delay. Healthy connections make no repeated version requests.
 - If the snapshot cannot be saved, the app keeps running. Repeated update attempts are limited to at most once per minute.
 - This is a full page reload with state restoration, so a brief repaint is possible. Network errors are retried normally; live requests, connections, and browser-owned state cannot be serialized.
 - The global provider handles version signals, cache restoration, scroll, focus, and text selection. Pages need no update-specific query hooks or DOM attributes.
 - Compatible saved fields survive added state fields; new fields keep their defaults. Incompatible state or data changes require new state or query keys.
 - Use the standard Zustand-backed `useApplicationState("stable-key:v1", initialState)` for JSON-compatible UI state; its persistence is automatic. TanStack Query's built-in restoring provider pauses query subscriptions until restoration finishes, then normal query freshness rules resume.
 - Controls and scroll regions are matched using existing names, labels, links, and IDs. Ambiguous matches are skipped. Arbitrary private React state and live browser resources cannot be restored globally.
 - Clients must load this updater once before future deployments can update them automatically. A tab still running a version from before this feature needs an initial reload.
 - Development retains Next.js hot reload. Deployment tooling can optionally set `NEXT_PUBLIC_APPLICATION_VERSION` at build time; that value must change for each new release.
 - No additional Azure service or dependency is required. If future deployments leave old servers running, use a shared push service to notify their connected clients too.
