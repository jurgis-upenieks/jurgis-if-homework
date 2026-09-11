import "server-only";

import { connection } from "next/server";
import { Catalog } from "./catalog";
import { loadCollection } from "./collection.server";
import type { CatalogData, CatalogPageProps } from "./types";

export async function CatalogPage({ source, pageSize, ...props }: CatalogPageProps) {
  await connection();

  let data: CatalogData;

  try {
    data = await loadCollection(source, { pageSize });
  } catch {
    return <Catalog {...props} failed />;
  }

  return <Catalog {...props} data={data} />;
}
