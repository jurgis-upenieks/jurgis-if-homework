import "server-only";

import { getQueryClient } from "../query";
import { isRecord } from "../utils";
import { getSearchTokens, normalizeSearchText } from "./search";
import type { CatalogData, CatalogPageProps, CollectionRequest, CollectionSource } from "./types";

export function loadCollection(source: CollectionSource, { page = 1, pageSize = 12, search = "", signal: requestSignal }: CollectionRequest = {}) {
  return getQueryClient().query({
    queryKey: ["catalog", source, page, pageSize, search],
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal }): Promise<CatalogData> => {
      const response = await fetch(source.url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000), ...(requestSignal ? [requestSignal] : [])]),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Catalogue request failed (${response.status}).`);
      }

      const payload: unknown = await response.json();
      const rows = isRecord(payload) ? payload[source.collection] : undefined;

      if (!Array.isArray(rows)) {
        throw new Error("Catalogue response must contain a collection.");
      }

      const fields = { id: "id", title: "title", detail: "detail", amount: "amount", rank: "rank", discountPercentage: "discountPercentage", ...source.fields };
      const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 12;
      const tokens = getSearchTokens(search);
      const data: CatalogData = { items: [], trendingTitle: null, total: 0, page: 1, pageSize: size };
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
        const discountPercentage = row[fields.discountPercentage];
        const minimumValue = source.minimum ? row[source.minimum.field] : undefined;

        if (
          !((typeof id === "string" && id.trim()) || (typeof id === "number" && Number.isFinite(id))) ||
          typeof title !== "string" || !title.trim() ||
          typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 ||
          typeof rank !== "number" || !Number.isFinite(rank) ||
          (detail != null && typeof detail !== "string") ||
          (discountPercentage !== undefined && (typeof discountPercentage !== "number" || !Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 100)) ||
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

        const searchableTitle = normalizeSearchText(title);

        if ((!source.minimum || (typeof minimumValue === "number" && minimumValue >= source.minimum.value)) && tokens.every((token) => searchableTitle.includes(token))) {
          data.items.push({
            id, title, detail: typeof detail === "string" ? detail.trim() || null : null, amount,
            discount: typeof discountPercentage === "number" && discountPercentage > 0 ? { percentage: discountPercentage, amount: amount * ((100 - discountPercentage) / 100) } : undefined,
          });
        }
      }

      data.total = data.items.length;
      const pageCount = Math.max(1, Math.ceil(data.total / size));
      data.page = Number.isFinite(page) ? Math.min(Math.max(1, Math.floor(page)), pageCount) : 1;
      data.items = data.items.slice((data.page - 1) * size, data.page * size);
      return data;
    },
  });
}

export function createCollectionRoute({ source, pageSize }: Pick<CatalogPageProps, "source" | "pageSize">) {
  return async function GET(request: Request) {
    const parameters = new URL(request.url).searchParams;
    const page = Number(parameters.get("page") ?? 1);
    const headers = { "Cache-Control": "no-store" };

    if (!Number.isSafeInteger(page) || page < 1) {
      return Response.json({ error: "Page must be a positive integer." }, { status: 400, headers });
    }

    try {
      const data = await loadCollection(source, { page, pageSize, search: parameters.get("search") ?? "", signal: request.signal });
      return Response.json(data, { headers });
    } catch {
      return Response.json({ error: "Catalogue is temporarily unavailable." }, { status: 502, headers });
    }
  };
}
