# Deploy to Microsoft Azure

Both sides of this application run together in one Next.js container on Azure
Container Apps. Next.js renders the catalogue and retrieves DummyJSON data on the
server; the browser receives the styles, fonts, JavaScript, and interactive
search/pagination. No separate API, database, application secret, or CORS setup is
needed. The application needs outbound HTTPS access to `dummyjson.com` at runtime.

## First deployment

Install [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
1.34.0 or newer. Use an Azure subscription where your account can create resource
groups, Container Apps, a container registry, a managed identity, a Log Analytics
workspace, and role assignments. Subscription Owner provides these permissions;
Contributor alone cannot create the registry's `AcrPull` role assignment. The
subscription must allow ACR Tasks and the Microsoft.App, Microsoft.ContainerRegistry,
Microsoft.ManagedIdentity, and Microsoft.OperationalInsights resource providers.

From the repository root, on Windows, macOS, or Linux:

```sh
azd auth login
azd env new homework-dev
azd up
```

Select your subscription and a region that supports Container Apps and ACR when
prompted. For example, use `westeurope` if it is available to your subscription.
Use a short environment name containing lowercase letters, numbers, and hyphens.

`azd up` provisions the resources, builds the Linux image in Azure Container
Registry, and deploys a revision with a public HTTPS address. Open the URL printed
at completion. Node.js, npm, Docker, and the Azure CLI are not required locally for
this remote-build path. The build needs access to npm, Docker Hub, and Google Fonts.

This command creates billable Azure resources. The app scales to zero when idle,
so its first request can take longer. The Basic registry and any retained logs can
still incur charges while the app is idle. The default maximum is one replica,
appropriate for this homework app's local Next.js cache.

## Deploy changes

```sh
azd deploy web
```

Use `azd up` after changing shared infrastructure. Application settings and the
image are deployed together from `infra/web.bicep`; provisioning shared resources
does not replace the running app with a placeholder image. Keep the same azd
environment for updates. Use `azd env select homework-dev` when switching back
from another environment. Local environment state lives in ignored `.azure/`.

## Verify a deployment

Visit `/health` on the deployed URL: it should return `{"status":"ok"}`. This is a
server health check; it deliberately does not depend on the external product API.
On the home page, verify that products load, search narrows the results, and Next
and Previous change pages.

The repository includes automated HTTP checks of server-rendered products,
JavaScript, CSS, fonts, the icon, and 404 responses. With Node.js 24 installed,
run these from the repository root, replacing the example URL:

```sh
npm --prefix Homework.Web.Tests ci
```

Bash or zsh:

```sh
DEPLOYMENT_URL=https://your-app.azurecontainerapps.io npm --prefix Homework.Web.Tests test -- test/deployment.test.ts
```

PowerShell:

```powershell
$env:DEPLOYMENT_URL = 'https://your-app.azurecontainerapps.io'
npm --prefix Homework.Web.Tests test -- test/deployment.test.ts
```

The product check also verifies that DummyJSON is reachable and returning valid
data. An upstream outage fails that check while `/health` remains successful.
Ordinary `npm test` skips these HTTP checks when `DEPLOYMENT_URL` is unset.

GitHub's **Validate** workflow runs unit tests and TypeScript checks, validates both
Bicep templates, builds the actual Linux image, and runs the HTTP checks against
that image. It needs no Azure credentials and does not deploy resources.

## Run the same image locally

With Docker installed, run these from the repository root:

```sh
docker build --platform linux/amd64 -f Homework.Web/generic-configurables/hosting/Dockerfile -t homework:local Homework.Web
docker run --rm --publish 3000:3000 homework:local
```

Open `http://localhost:3000`. The image uses Node.js 24, runs as the `node` user,
listens on `0.0.0.0:3000`, and includes the standalone server plus static assets.
Its Next.js cache is writable and disposable. Do not mount the application as a
read-only filesystem. Runtime data is fetched on requests; building the image
does not require the product API to respond.

Normal development is unchanged: run `npm ci` and `npm run dev` inside
`Homework.Web`. Use Node.js 24; `.nvmrc` selects that version for nvm users.

## Configuration and troubleshooting

- `azure.yaml` selects remote builds and revision deployment. `infra/main.bicep`
  configures shared resources; `infra/web.bicep` configures this application's
  container. Reusable hosting definitions live in
  `Homework.Web/generic-configurables/hosting/`.
- Azure terminates HTTPS. The container serves HTTP internally on port 3000.
  Startup, readiness, and liveness probes call `/health` on that same port.
- Container Apps pulls images using managed identity. The registry's admin
  account is disabled; no registry password or publish profile is stored.
- Build inputs use an allowlist in `Homework.Web/.dockerignore`. Local `.env`
  files, PEM/key files, `node_modules`, and `.next` are excluded. Configure any
  future runtime secrets using Container Apps secrets, not the image.
- If provisioning fails with authorization errors, check role-assignment
  permissions and resource-provider registration. If a subscription disallows
  ACR Tasks, enable that capability or use a subscription that supports it.
- Inspect failed builds in the registry's Tasks/Runs view. Inspect startup,
  image-pull, and request errors in the Container App's Log stream and Revisions
  views. If the first image pull fails during role-assignment propagation, retry
  `azd deploy web` once Azure has applied the `AcrPull` assignment.
- A product error with a healthy server indicates an external API/network/data
  problem. The existing Try again button retries the page. The Next.js fetch
  cache revalidates after five minutes and is recreated on new replicas.
- To roll back, check out the desired revision in a separate clean checkout.
  Run `azd env new` with the original environment name, subscription, and region,
  then `azd env refresh` to retrieve the provisioned resource outputs. Run
  `azd deploy web` to deploy that source revision to the existing environment.

## Remove this environment

From the correct selected azd environment, run `azd down` and review its
confirmation. It deletes the environment's resource group and all resources
inside it, including its images and logs.

## Reference

This setup follows Microsoft's [remote build workflow](https://learn.microsoft.com/azure/developer/azure-developer-cli/remote-builds)
and [revision deployment workflow](https://learn.microsoft.com/azure/developer/azure-developer-cli/container-apps-workflows),
and Next.js [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).
