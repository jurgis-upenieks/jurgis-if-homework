import { getQueryClient } from "@/lib/query-client";
import type { CatalogData, CollectionSource } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadCollection(source: CollectionSource) {
  return getQueryClient().query({
    queryKey: ["catalog", source],
    retry: false,
    queryFn: async ({ signal }): Promise<CatalogData> => {
      const request = {
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
        next: { revalidate: 300 },
      };
      const response = await fetch(source.url, request);

      if (!response.ok) {
        throw new Error(`Catalogue request failed (${response.status}).`);
      }

      const payload: unknown = await response.json();
      const rows = isRecord(payload) ? payload[source.collection] : undefined;

      if (!Array.isArray(rows)) {
        throw new Error("Catalogue response must contain a collection.");
      }

      const fields = { id: "id", title: "title", detail: "detail", amount: "amount", rank: "rank", ...source.fields };
      const data: CatalogData = { items: [], trendingTitle: null };
      const ids = new Set<string | number>();
      let highestRank = -Infinity;

      for (const row of rows) {
        if (!isRecord(row)) {
          throw new Error("Catalogue entries must be objects.");
        }

        const id = row[fields.id];
        const title = row[fields.title];
        const detail = row[fields.detail];
        const amount = row[fields.amount];
        const rank = row[fields.rank];
        const minimumValue = source.minimum ? row[source.minimum.field] : undefined;

        if (
          !((typeof id === "string" && id.trim()) || (typeof id === "number" && Number.isFinite(id))) ||
          typeof title !== "string" || !title.trim() ||
          typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 ||
          typeof rank !== "number" || !Number.isFinite(rank) ||
          (detail != null && typeof detail !== "string") ||
          (source.minimum && (typeof minimumValue !== "number" || !Number.isFinite(minimumValue)))
        ) {
          throw new Error("Catalogue entry has invalid fields.");
        }

        if (ids.has(id)) {
          throw new Error("Catalogue entry identifiers must be unique.");
        }

        ids.add(id);

        if (rank > highestRank) {
          highestRank = rank;
          data.trendingTitle = title;
        }

        if (!source.minimum || (typeof minimumValue === "number" && minimumValue >= source.minimum.value)) {
          data.items.push({ id, title, detail: typeof detail === "string" ? detail.trim() || null : null, amount });
        }
      }

      return data;
    },
  });
}
