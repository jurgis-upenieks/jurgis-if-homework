export type CatalogPageProps = {
  name: string;
  title: string;
  source: CollectionSource;
  endpoint: string;
  trendingLabel?: string;
  missingDetail?: string;
  pageSize?: number;
  currency?: string;
};

export type CollectionSource = {
  url: string;
  collection: string;
  fields?: Partial<Record<"id" | "title" | "detail" | "amount" | "rank", string>>;
  minimum?: { field: string; value: number };
};


export type CatalogItem = {
  id: string | number;
  title: string;
  detail: string | null;
  amount: number;
};

export type CatalogData = {
  items: CatalogItem[];
  trendingTitle: string | null;
  total: number;
  page: number;
  pageSize: number;
};

export type CatalogProps = Omit<CatalogPageProps, "source" | "pageSize"> & {
  data?: CatalogData;
  failed?: boolean;
};

export type CollectionRequest = {
  page?: number;
  pageSize?: number;
  search?: string;
  signal?: AbortSignal;
};
