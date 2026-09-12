import "server-only";

import { connection } from "next/server";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { Catalog } from "./catalog";
import { collectionQuery } from "./collection.server";
import type { CatalogPageProps } from "./types";

export async function CatalogPage({ source, pageSize, ...props }: CatalogPageProps) {
  await connection();

  const client = new QueryClient();
  const queryKey = ["catalog", props.endpoint, 1, ""];

  try {
    await client.query({ ...collectionQuery(source, { pageSize }), queryKey });
  } catch {
    const error = new Error("Catalogue is temporarily unavailable.");
    client.getQueryCache().find({ queryKey })?.setState({ error, fetchFailureReason: error });
  }

  return (
    <HydrationBoundary state={dehydrate(client, { shouldDehydrateQuery: () => true })}>
      <Catalog {...props} updatedAt={client.getQueryState(queryKey)?.dataUpdatedAt} />
    </HydrationBoundary>
  );
}
