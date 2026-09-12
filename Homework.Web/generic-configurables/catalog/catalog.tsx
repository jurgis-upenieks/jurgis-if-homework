"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { ApplicationHeader } from "../application/application-header";
import { ApplicationScrollArea, ApplicationScrollContent, ApplicationScrollViewport } from "../application/application-scroll-area";
import { Button, Card, Input } from "../ui";
import { getSearchTokens } from "./search";
import type { CatalogData, CatalogProps } from "./types";
import layout from "../application/application.module.css";
import styles from "./catalog.module.css";

export function Catalog({
  name, title, endpoint, navigation = [{ label: title, href: "/" }], trendingLabel = "Trending item", missingDetail = "Not specified",
  currency = "EUR", updatedAt = 0,
}: CatalogProps) {
  const id = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const pagination = useRef<HTMLElement>(null);
  const [store] = useState(() => createStore(() => ({ search: "", appliedSearch: "", page: 1 })));
  const { search, appliedSearch, page } = useStore(store);
  const update = store.setState;
  const query = getSearchTokens(appliedSearch).join(" ");
  const { data, isError: failed, isFetching, refetch } = useQuery({
    queryKey: ["catalog", endpoint, page, query],
    queryFn: async ({ signal }): Promise<CatalogData> => {
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set("page", String(page));
      if (query) url.searchParams.set("search", query);
      const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]), cache: "no-store" });

      if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
      return response.json();
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: (cached) => page !== 1 || Boolean(query) || !updatedAt || cached.state.dataUpdatedAt > updatedAt,
    retryOnMount: false,
    retry: false,
  });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = data ? Math.max(1, Math.ceil(total / data.pageSize)) : 1;
  const currentPage = data?.page ?? 1;
  const start = data ? (currentPage - 1) * data.pageSize : 0;
  const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
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

  useLayoutEffect(() => {
    const element = pagination.current;
    if (!element || pageCount <= 1) return;
    const [previous, info, next] = element.children;
    const labels = Array.from(info.children);
    const fit = () => {
      const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
      const available = element.getBoundingClientRect().width - previous.getBoundingClientRect().width - next.getBoundingClientRect().width - gap * 2;
      const required = Math.max(...labels.map((label) => label.getBoundingClientRect().width));
      element.toggleAttribute("data-stacked", required > available);
    };
    const observer = new ResizeObserver(fit);
    for (const target of [element, previous, next, ...labels]) observer.observe(target);
    fit();

    return () => {
      observer.disconnect();
      element.removeAttribute("data-stacked");
    };
  }, [pageCount, failed]);

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
                disabled={!data && !updatedAt}
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
              <Button variant="outline" className={styles.control} onClick={() => void refetch()}>Try again</Button>
            </ApplicationScrollContent>
          ) : (
            <ApplicationScrollContent render={<ul />} role="list" aria-label={title} className={styles.grid}>
              {items.map((item) => (
                <li key={`${typeof item.id}:${item.id}`} className={styles.listItem}>
                  <Card title={item.title} className={layout.card}>
                    <p className={styles.details}>
                      <span className={styles.detail}>{item.detail ?? missingDetail}</span>
                      <span className={styles.pricing}>
                        {item.discount && (
                          <span className={styles.discount}>
                            <span className="sr-only">Discount: </span>−{Math.round(item.discount.percentage)}%
                          </span>
                        )}
                        <span className={styles.prices}>
                          <strong className={styles.price}>
                            <span className="sr-only">{item.discount ? "Discounted price: " : "Price: "}</span>{formatter.format(item.discount?.amount ?? item.amount)}
                          </strong>
                          {item.discount && <s className={styles.originalPrice}><span className="sr-only">Original price: </span>{formatter.format(item.amount)}</s>}
                        </span>
                      </span>
                    </p>
                  </Card>
                </li>
              ))}
            </ApplicationScrollContent>
          )}
        </ApplicationScrollViewport>
        {data && !failed && (
          <footer className={styles.paginationRow}>
            <nav ref={pagination} aria-label={pageCount > 1 ? "Pagination" : undefined} role={pageCount > 1 ? undefined : "presentation"} className={styles.pagination}>
              {pageCount > 1 && (
                <Button variant="outline" className={styles.control} disabled={loading || currentPage === 1} focusableWhenDisabled={loading}
                  onClick={() => update({ page: currentPage - 1 })}>Previous</Button>
              )}
              <div className={styles.pageInfo}>
                {pageCount > 1 && <span aria-current="page">Page {currentPage} of {pageCount}</span>}
                <p role="status" aria-live="polite" aria-atomic="true">
                  {total ? `${start + 1}–${start + items.length} of ${total}` : loading ? `Loading ${title.toLowerCase()}…` :
                    query ? `No ${title.toLowerCase()} match “${appliedSearch}”.` : `No ${title.toLowerCase()} available.`}
                </p>
              </div>
              {pageCount > 1 && (
                <Button variant="outline" className={styles.control} disabled={loading || currentPage === pageCount} focusableWhenDisabled={loading}
                  onClick={() => update({ page: currentPage + 1 })}>Next</Button>
              )}
            </nav>
          </footer>
        )}
      </main>
    </ApplicationScrollArea>
  );
}
