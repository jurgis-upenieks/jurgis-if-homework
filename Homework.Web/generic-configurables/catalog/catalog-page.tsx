import "server-only";

import { Suspense } from "react";
import { connection } from "next/server";
import { Catalog } from "./catalog";
import { loadCollection } from "./collection.server";
import type { CatalogData, CatalogPageProps } from "./types";

async function CatalogContent({ source, ...props }: CatalogPageProps) {
  await connection();

  let data: CatalogData;

  try {
    data = await loadCollection(source);
  } catch {
    return <Catalog {...props} failed />;
  }

  return <Catalog {...props} data={data} />;
}

export function CatalogPage({ source, ...props }: CatalogPageProps) {
  return (
    <Suspense fallback={<Catalog {...props} />}>
      <CatalogContent {...props} source={source} />
    </Suspense>
  );
}
