# Deploy to Azure App Service

This project runs as one Node.js 24 application on Azure App Service for Linux.
Next.js retrieves fresh catalogue data and renders the first page's products in
the initial HTML. Search and pagination request only the selected page's JSON
from `/api/products`. Menus and rendering of subsequent pages run in the browser.
The deployment includes both sides and retains server-side rendering.

The server fetches the external collection on every catalogue request to apply
the discount filter, search titles, and find the global highest-rated product.
Only the requested page and its pagination metadata are sent to the browser.
Upstream fetches and JSON responses use `no-store`; product data is not cached
between server requests.

GitHub builds and tests each push to `main`, then deploys the verified ZIP to
production. Pull requests run the same checks without deploying. The application
does not need a separate API, database, application secret, or CORS configuration.

## One-time setup

### 1. Create the Web App

Push this repository's deployment changes to `main` before connecting Azure.
Until `AZURE_WEBAPP_NAME` is configured, the included workflow only validates.

In [Azure Portal](https://portal.azure.com), open **Create a resource → Web App**.

| Setting | Value |
| --- | --- |
| Subscription | Your Azure subscription |
| Resource group | Create a group for this application |
| Name | An available name, for example `homework-production-yourname` |
| Publish | **Code** |
| Runtime stack | **Node 24 LTS** |
| Operating system | **Linux** |
| Region | Your preferred available region |
| App Service plan | **Basic B1** for a small production app |

Select **Review + create → Create → Go to resource**. B1 is a paid plan and
continues billing while idle. Under **Settings → Configuration → General settings**, enable
**Always On**. Keep **HTTPS Only** enabled.

Under **Settings → Configuration → General settings**, set **Startup Command**
before the first deployment to:

```sh
HOSTNAME=0.0.0.0 node server.js
```

The workflow also maintains this command on later deployments. It starts the
server at the deployed ZIP root; the repository's local `npm start` command
instead starts the server inside its `build/` directory.

Under **Settings → Environment variables → App settings**, set
`SCM_DO_BUILD_DURING_DEPLOYMENT` to `false`: GitHub supplies an already-built
application. Leave `WEBSITE_RUN_FROM_PACKAGE` unset, removing it if you are
reusing an app that has it. ZIP deployment extracts the standalone application
files. Save the settings.

### 2. Connect GitHub using Deployment Center

Open **Deployment → Deployment Center → Settings**:

1. Select **GitHub** as the source and authorize repository access.
2. Select your organization, `jurgis-if-homework` repository, and **main** branch.
3. Select **GitHub Actions** as the build provider.
4. Select **User-assigned identity** for authentication and create a new identity
   through the wizard, or select an existing identity offered by it.
5. Select **Save**.

Your account needs permission to create the identity and assign its access to
the app. Subscription Owner includes these permissions. If your account lacks
them, the Azure administrator must provide an identity with the **Website
Contributor** role on this Web App. You also need GitHub access to manage the
repository's Actions configuration.

Azure creates the GitHub authentication connection, repository secrets, and a
starter workflow. No separate Entra application registration or client password
is needed. The connection trusts pushes to this repository's `main` branch.

### 3. Keep the repository's prepared workflow

Deployment Center's starter workflow assumes an application at the repository
root. This application lives in `Homework.Web`, so use the prepared workflow
instead. This is a one-time configuration step:

1. In **GitHub → Actions**, cancel the run started by Azure's new workflow.
2. Open that generated file in `.github/workflows/`, typically named
   `main_<your-app-name>.yml`. Locate its `azure/login` step.
3. Open this repository's `.github/workflows/azure-app-service.yml`. In its
   `azure/login` step, replace the three secret references with the matching
   references from Azure's generated file:

   | Input | Copy from the generated login step |
   | --- | --- |
   | `client-id` | Its complete `${{ secrets.… }}` expression |
   | `tenant-id` | Its complete `${{ secrets.… }}` expression |
   | `subscription-id` | Its complete `${{ secrets.… }}` expression |

   Azure may give the secrets names with generated suffixes. Copy the references
   exactly; the secret values stay in GitHub. If Azure used the existing names
   `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`, no edits are
   needed.
4. Delete Azure's generated starter workflow in the same commit. Retain
   `azure-app-service.yml` as the only deployment workflow. Commit and push to
   `main`, or merge through a pull request if branch protection requires it.
5. In **GitHub → Settings → Secrets and variables → Actions → Variables**, create
   the repository variable **AZURE_WEBAPP_NAME** with the exact Web App name
   from step 1, without a URL or `.azurewebsites.net` suffix.
6. In **GitHub → Actions → Validate and deploy → Run workflow**, select **main**
   and run it. Adding a variable alone does not trigger deployment.

Subsequent pushes to `main` build, test, and deploy automatically. Do not add a
GitHub `environment` to the deployment job: this connection uses a branch-based
credential. Do not regenerate the starter workflow in Deployment Center after
setup. Follow deployment results in GitHub Actions.

### 4. Check the production site

After both workflow jobs succeed, open **Azure → Web App → Overview → Default
domain**. Use the URL shown there; Azure may include an extra suffix in the
hostname. Confirm products appear, search narrows the results, and pagination
works. `/health` must return `{"status":"ok"}`.

The workflow checks the deployed server-rendered products, JavaScript, CSS,
fonts, icon, and 404 response automatically. Under **Monitoring → Health check**,
you can also enable `/health` for Azure's ongoing checks.

## What gets built and deployed

`npm run build` in `Homework.Web` runs ESLint and the Next.js production build.
Its `postbuild` script packages the generated standalone server in `build/`:

- `server.js` and its traced production dependencies.
- `.next` server files and `.next/static` browser assets, including bundled fonts.
- `public/` assets when that directory exists.

Packaging removes previous `build/` contents and excludes `.env*` files. Future
runtime secrets belong in Azure App Service's environment variables. Next.js
still embeds build-time public variables into browser bundles as usual.

The workflow archives the contents of `build/`, including hidden files, so
`server.js` is at the ZIP root. It extracts that ZIP into an isolated directory
and tests it before uploading the exact same ZIP for deployment. A failed check
prevents deployment. GitHub serializes runs for the same branch and queues up
to 100 pending runs without canceling the active deployment.

The deployment action sets the startup command to:

```sh
HOSTNAME=0.0.0.0 node server.js
```

Azure supplies `PORT` and handles public HTTPS. The server uses Azure's port and
does not cache catalogue data. The build runs on Linux with
Node.js 24 so its native dependencies match App Service. Do not upload a
locally built macOS or Windows package to the Linux app.

## Local development and production checks

Use Node.js 24.2 or later within version 24; `.nvmrc` selects the current version
24 release for nvm users. From the repository root:

```sh
npm --prefix Homework.Web ci
npm --prefix Homework.Web run dev
```

For the packaged production server:

```sh
npm --prefix Homework.Web run build
npm --prefix Homework.Web start
```

Open `http://localhost:3000`. If your shell already defines `HOSTNAME` or `PORT`,
set them to `0.0.0.0` and `3000` for this local check.

In another terminal, install the independent test project and run its checks:

```sh
npm --prefix Homework.Web.Tests ci
npm --prefix Homework.Web.Tests test
npm --prefix Homework.Web.Tests run build
```

To run HTTP checks against the local server or the production URL, set
`DEPLOYMENT_URL`. For Bash or zsh:

```sh
DEPLOYMENT_URL=http://localhost:3000 npm --prefix Homework.Web.Tests test -- test/deployment.test.ts
```

For PowerShell:

```powershell
$env:DEPLOYMENT_URL = 'http://localhost:3000'
npm --prefix Homework.Web.Tests test -- test/deployment.test.ts
```

Ordinary unit tests skip the HTTP checks when `DEPLOYMENT_URL` is unset.

## Operations and troubleshooting

- The GitHub **Validate and deploy** workflow is the source of build and
  deployment logs. A skipped deployment usually means `AZURE_WEBAPP_NAME` is
  missing or the run is not for `main`.
- For Azure login failures, check the three secret references, the identity's
  access to the Web App, and its federated repository/branch. Keep `main` as
  the deployment branch in both Azure's connection and this workflow.
- For startup failures, open **Azure → Web App → Monitoring → Log stream**.
  Check Node 24 LTS, the startup command, and the ZIP's root layout. The workflow
  extracts and deploys prebuilt files; server-side rebuilds must stay disabled.
- The build needs access to npm and Google Fonts. Runtime needs outbound HTTPS
  to `dummyjson.com`. Catalogue retrieval times out after ten seconds and
  always requests fresh product data without caching it.
- `/health` deliberately does not call DummyJSON. An upstream failure can leave
  `/health` successful while the catalogue and its HTTP test fail. The existing
  **Try again** button retries the current JSON data request.
- Every production build embeds a unique application version. `/api/version`
  returns JSON for HTTP checks and an event stream for browser EventSource clients.
  The current deployment's restart closes old streams. Browsers reconnect and the
  new server pushes its version, triggering an idle reload with a per-tab snapshot.
  There is no periodic browser version polling or additional Azure service.
  A deployment HTTP error that stops native reconnection causes the updater to
  reopen that failed stream after a short delay.
  Older clients must load this feature once. The workflow verifies that both
  endpoint formats agree with rendered page metadata and deliver the first event.
  Streaming responses disable caching and transformation and send keepalives every
  25 seconds. Any additional reverse proxy must allow streaming without buffering.
  Enable HTTP/2 in App Service for many simultaneous tabs. If switching to deployments
  that keep old instances alive, use a shared broadcaster such as Azure Web PubSub.
  An optional build-time `NEXT_PUBLIC_APPLICATION_VERSION` must be unique per release.
- Deployment replaces files and restarts the app. A single B1 instance can have
  a brief interruption during deployment. This setup does not provide staging
  slots or automatic rollback.
- To roll back code, revert the problematic commit on `main` and push. The same
  workflow builds, checks, and deploys the reverted version.
- Removing the old deployment files from this repository does not delete any
  previously provisioned Azure resources. After verifying the App Service site,
  review and delete any resources dedicated to the previous deployment so they
  stop billing. Keep unrelated resources and shared App Service plans.

## References

- [Create a Node.js Web App](https://learn.microsoft.com/azure/app-service/quickstart-nodejs).
- [Deployment Center and GitHub authentication](https://learn.microsoft.com/azure/app-service/deploy-continuous-deployment).
- [Deploy a built application with GitHub Actions](https://learn.microsoft.com/azure/app-service/deploy-github-actions).
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
