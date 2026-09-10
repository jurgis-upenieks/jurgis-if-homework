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
 - I am using the 113 EUR monthly codex plan with GPT-6 Astra XHigh effort mode.
 - I am doing extra re-validation with the Critic in a loop.

# 7. For stuff, which is fitting to go into the server-side, it is put in the server-side code.