export type CatalogPageProps = {
  name: string;
  title: string;
  source: CollectionSource;
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
};

export type CatalogProps = Omit<CatalogPageProps, "source"> & {
  data?: CatalogData;
  failed?: boolean;
};
