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

# 10. Unit-tests are automatically generated and maintained as needed by codex, because it is instructed to do so by the AGENTS.md custom guideline rules. It does that automatically every time I am asking to implement or change something. This ensures that the unit-test coverage is always guaranteed to be close to 100%.

# 11. There is a loading spinner and a half transparent full site overlay so a user is blocked from interacting with front-end while waiting for the remote/async actions to be completed. And it has a slow fade in when needs to be shown to reduce screen flashing, and fade out quickly, when is not needed anymore. And it is implemented in global way, so it automatically/implicitly applies to absolutely all remote calls.

# 12. I have configured the app so that the "Technical details" page is rendered only on build/compile-time, because it has a fully static content. The server-side-renderer is never bothered with re-rendering of that page. Also, it is always automatically fully reflecting the content of the root README.md, because at build-time it takes the texts from the that README.me.

# 13. Locally running or building the app
 - To run the app locally with live-reload, from the project root dir run command: `npm --prefix Homework.Web run dev`
 - To build the app, from project root dir run command: `npm --prefix Homework.Web run build`

# 14. The products filter has such features:
 - Live search while typing, but with a debounce of 300ms.
 - Can search by tokens, which:
   - Are separated by spaces;
   - Case-insensitive;
   - International character insensitive;
   - Order insensitive;

# 15. Technologies stack
 - TypeScript: strong types for business domain model data and component configuration.
 - Node.js 24 and npm: runs the app server and deployment packaging; npm manages dependencies and scripts.
 - React and React DOM: for implementing custom components - product cards, search, pagination, navigation, and page hydration.
 - Next.js and App Router: for full-stack app, server-rendered products, static Technical details, and `/api/products` and `/health` endpoints.
 - Zustand: central data access state management solution to avoid default property drilling.
 - TanStack Query: manager remote calls to from client-side to server-side and to external service side - product fetching, request errors, the shared loading overlay, and query caching.
 - DummyJSON supplies products; Fetch retrieves them server-side and calls `/api/products` client-side.
 - Tailwind CSS, PostCSS, and CSS Modules: css bootstrap solution.
 - shadcn/ui + Base UI: a reusable components solution for product cards, search input, pagination buttons, loading overlay, and scrollbars.
 - `next-themes`: applies the site theme, defaulting to light.
 - `cn`: combines shared component styles with catalogue styles.
 - ESLint and TypeScript checks: validate app and test code during builds.
 - Vitest, Vite, React Testing Library, and jsdom: test catalogue behavior, loading, documentation, and packaging.
 - Git and GitHub: version control.
 - GitHub Actions: tests, builds, Azure deployment from `main` via OIDC, and production checks.
 - Microsoft Azure App Service on Linux: hosts the Next.js pages and APIs.
