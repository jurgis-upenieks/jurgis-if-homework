import { QueryClient } from "@tanstack/react-query";

export function fetchDeployment(url: URL, deploymentId?: string) {
  const deadline = AbortSignal.timeout(180_000);

  return new QueryClient().query({
    queryKey: ["deployment", url.href, deploymentId],
    gcTime: 0,
    networkMode: "always",
    retry: () => !deadline.aborted,
    retryDelay: 5_000,
    queryFn: async ({ signal }) => {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.any([signal, deadline, AbortSignal.timeout(60_000)]),
      });
      const actualId = response.headers.get("x-deployment-id");

      if (deploymentId && actualId !== deploymentId) {
        await response.body?.cancel();
        throw new Error(`${url.href}: expected deployment ${deploymentId}, received ${actualId ?? "no deployment identity"}.`);
      }

      return response;
    },
  });
}
