"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApplicationHeader } from "../application/application-header";
import { ApplicationScrollArea, ApplicationScrollContent, ApplicationScrollViewport } from "../application/application-scroll-area";
import { useApplicationState } from "../application/application-state";
import { Button, Card, Input } from "../ui";
import { getSearchTokens } from "./search";
import type { CatalogData, CatalogProps } from "./types";
import layout from "../application/application.module.css";
import styles from "./catalog.module.css";

export function Catalog({
  name, title, endpoint, navigation = [{ label: title, href: "/" }], trendingLabel = "Trending item", missingDetail = "Not specified",
  currency = "EUR", data: initialData, failed: initialFailed = false,
}: CatalogProps) {
  const id = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const [{ search, appliedSearch, page, serverFailed }, update] = useApplicationState(`catalog:${endpoint}:v1`, { search: "", appliedSearch: "", page: 1, serverFailed: initialFailed });
  const query = getSearchTokens(appliedSearch).join(" ");
  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ["catalog", endpoint, page, query],
    queryFn: async ({ signal }): Promise<CatalogData> => {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set("page", String(page));
      if (query) url.searchParams.set("search", query);
      const response = await fetch(url, { signal, cache: "no-store" });

      if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
      return response.json();
    },
    initialData: page === 1 && !query ? initialData : undefined,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: false,
    retry: false,
    enabled: !serverFailed,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = data ? Math.max(1, Math.ceil(total / data.pageSize)) : 1;
  const currentPage = data?.page ?? 1;
  const start = data ? (currentPage - 1) * data.pageSize : 0;
  const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const failed = serverFailed || isError;
  const loading = isFetching || (!data && !failed);

  const applySearch = useCallback((value: string) => {
    if (getSearchTokens(value).join(" ") === query) return;
    update({ appliedSearch: value.trim(), page: 1 });
  }, [query, update]);

  useEffect(() => {
    if (getSearchTokens(search).join(" ") === query) return;

    const timeout = setTimeout(() => applySearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search, query, applySearch]);

  useLayoutEffect(() => {
    if (results.current) results.current.scrollTop = 0;
  }, [page, currentPage, query]);

  return (
    <ApplicationScrollArea>
      <ApplicationHeader name={name} navigation={navigation} contentId={`${id}-main`} />
      <main id={`${id}-main`} tabIndex={-1} className={layout.main} aria-busy={loading}>
        <header className={styles.toolbar}>
          <h1 className={layout.heading}>{title}</h1>
          <p className={styles.trending}>
            <strong>{trendingLabel}:</strong>{" "}{data?.trendingTitle ?? (loading ? "Loading…" : "Unavailable")}
          </p>
          <form role="search" className={styles.search} onSubmit={(event) => { event.preventDefault(); applySearch(search); }}>
            <label className={styles.searchLabel}>
              <span className="sr-only">Search {title.toLowerCase()} by title</span>
              <Input
                ref={searchInput}
                type="search"
                name="search"
                placeholder="Search…"
                className={styles.searchInput}
                value={search}
                allowWhileLoading
                disabled={!initialData && !data}
                aria-controls={data && !failed ? `${id}-items` : undefined}
                onValueChange={(search) => update({ search })}
              />
            </label>
            {search && (
              <Button type="button" variant="ghost" className={styles.control}
                onClick={() => { update({ search: "", appliedSearch: "", page: 1 }); searchInput.current?.focus(); }}>
                Clear
              </Button>
            )}
          </form>
        </header>
        <ApplicationScrollViewport ref={results} id={`${id}-items`} role="region" aria-label={title} tabIndex={items.length || failed ? 0 : -1} className={layout.content}>
          {loading && !data ? (
            <ApplicationScrollContent render={<p />} role="status">Loading {title.toLowerCase()}…</ApplicationScrollContent>
          ) : failed ? (
            <ApplicationScrollContent render={<section />} role="alert" className={styles.message}>
              <h2 className={styles.cardTitle}>We couldn’t load {title.toLowerCase()}.</h2>
              <p>Please try again in a moment.</p>
              <Button variant="outline" className={styles.control}
                onClick={() => { if (serverFailed) update({ serverFailed: false }); else void refetch(); }}>Try again</Button>
            </ApplicationScrollContent>
          ) : (
            <ApplicationScrollContent render={<ul />} role="list" aria-label={title} className={styles.grid}>
              {items.map((item) => (
                <li key={`${typeof item.id}:${item.id}`} className={styles.listItem}>
                  <Card title={item.title} className={layout.card}>
                    <p className={styles.details}>
                      <span className={styles.detail}>{item.detail ?? missingDetail}</span>
                      <span className={styles.price}>{formatter.format(item.amount)}</span>
                    </p>
                  </Card>
                </li>
              ))}
            </ApplicationScrollContent>
          )}
        </ApplicationScrollViewport>
        {data && !failed && (
          <footer className={styles.paginationRow}>
            <p role="status" aria-live="polite" aria-atomic="true" className={styles.resultCount}>
              {loading ? `Loading ${title.toLowerCase()}…` : total ? `${start + 1}–${start + items.length} of ${total} ${title.toLowerCase()}` :
                query ? `No ${title.toLowerCase()} match “${appliedSearch}”.` : `No ${title.toLowerCase()} available.`}
            </p>
            {pageCount > 1 && (
              <nav aria-label="Pagination" className={styles.pagination}>
                <Button variant="outline" className={styles.control} disabled={loading || currentPage === 1} focusableWhenDisabled={loading}
                  onClick={() => update({ page: currentPage - 1 })}>Previous</Button>
                <span className={styles.pageNumber} aria-current="page">Page {currentPage} of {pageCount}</span>
                <Button variant="outline" className={styles.control} disabled={loading || currentPage === pageCount} focusableWhenDisabled={loading}
                  onClick={() => update({ page: currentPage + 1 })}>Next</Button>
              </nav>
            )}
          </footer>
        )}
      </main>
    </ApplicationScrollArea>
  );
}
