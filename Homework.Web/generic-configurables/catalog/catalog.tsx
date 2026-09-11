"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CatalogData, CatalogProps } from "./types";
import styles from "./catalog.module.css";

export function Catalog({ name, title, endpoint, trendingLabel = "Trending item", missingDetail = "Not specified", currency = "EUR", data: initialData, failed: initialFailed = false }: CatalogProps) {
  const id = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const results = useRef<HTMLUListElement>(null);
  const headerContent = useRef<HTMLDivElement>(null);
  const brand = useRef<HTMLAnchorElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const restoreNavigationFocus = useRef(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [serverFailed, setServerFailed] = useState(initialFailed);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compactNavigation, setCompactNavigation] = useState(true);
  const query = search.trim().toLocaleLowerCase("en");
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

  useLayoutEffect(() => {
    if (results.current) results.current.scrollTop = 0;
  }, [page, currentPage, query]);

  useEffect(() => {
    const headerElement = headerContent.current;
    const brandElement = brand.current;
    const navigationElement = navigation.current;

    if (!headerElement || !brandElement || !navigationElement) return;

    const observer = new ResizeObserver(() => {
      const gap = Number.parseFloat(getComputedStyle(headerElement).columnGap);
      const requiredWidth = brandElement.getBoundingClientRect().width + navigationElement.getBoundingClientRect().width + gap;
      const compact = requiredWidth > headerElement.clientWidth;

      if (compact && navigationElement.contains(document.activeElement)) setMenuOpen(true);
      restoreNavigationFocus.current = !compact && document.activeElement === menuButton.current;
      setCompactNavigation(compact);
    });

    observer.observe(headerElement);
    observer.observe(brandElement);
    observer.observe(navigationElement);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (restoreNavigationFocus.current) {
      navigation.current?.querySelector<HTMLAnchorElement>("a[href]")?.focus();
      restoreNavigationFocus.current = false;
    }
  }, [compactNavigation]);

  return (
    <div className={styles.page}>
      <a href={`#${id}-main`} className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <div ref={headerContent} className={styles.headerContent}>
          <Link ref={brand} className={styles.name} href="/">
            <span aria-hidden="true" className={styles.brandMark}>{name.charAt(0)}</span>
            {name}
          </Link>
          <Button
            ref={menuButton}
            variant="outline"
            className={styles.menuButton}
            hidden={!compactNavigation}
            aria-expanded={menuOpen}
            aria-controls={`${id}-navigation`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            Menu
          </Button>
          <nav
            ref={navigation}
            id={`${id}-navigation`}
            aria-label="Main navigation"
            aria-hidden={compactNavigation && !menuOpen}
            inert={compactNavigation && !menuOpen}
            className={styles.navigation}
          >
            <Link className={styles.homeLink} href="/" aria-current="page">Home</Link>
          </nav>
        </div>
      </header>
      <main id={`${id}-main`} tabIndex={-1} className={styles.main} aria-busy={loading}>
        <h1 className={styles.heading}>{title}</h1>
        <div className={styles.toolbar}>
          <p className={styles.trending}>
            <strong>{trendingLabel}:</strong>{" "}{data?.trendingTitle ?? (loading ? "Loading…" : "Unavailable")}
          </p>
          <form role="search" className={styles.search} onSubmit={(event) => event.preventDefault()}>
            <label className={styles.searchLabel}>
              <span className={styles.visuallyHidden}>Search {title.toLowerCase()} by title</span>
              <Input
                ref={searchInput}
                type="search"
                name="search"
                placeholder="Search…"
                className={styles.searchInput}
                value={search}
                disabled={!initialData && !data}
                aria-controls={data && !failed ? `${id}-items` : undefined}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </label>
            {search && (
              <Button variant="ghost" className={styles.control} onClick={() => { setSearch(""); setPage(1); searchInput.current?.focus(); }}>
                Clear
              </Button>
            )}
          </form>
        </div>
        {loading && !data ? (
          <p role="status" className={styles.content}>Loading {title.toLowerCase()}…</p>
        ) : failed ? (
          <section role="alert" tabIndex={0} className={`${styles.message} ${styles.content}`}>
            <h2 className={styles.cardTitle}>We couldn’t load {title.toLowerCase()}.</h2>
            <p>Please try again in a moment.</p>
            <Button variant="outline" className={styles.control} onClick={() => { if (serverFailed) setServerFailed(false); else void refetch(); }}>Try again</Button>
          </section>
        ) : (
          <>
            <ul ref={results} id={`${id}-items`} role="list" aria-label={title} tabIndex={0} className={`${styles.grid} ${styles.content}`}>
              {items.map((item) => (
                <li key={item.id} className={styles.listItem}>
                  <Card title={item.title} className={styles.card}>
                    <p className={styles.details}>
                      <span className={styles.detail}>{item.detail ?? missingDetail}</span>
                      <span className={styles.price}>{formatter.format(item.amount)}</span>
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
            <p role="status" aria-live="polite" aria-atomic="true" className={styles.resultCount}>
              {loading ? `Loading ${title.toLowerCase()}…` : total ? `${start + 1}–${start + items.length} of ${total} ${title.toLowerCase()}` :
                query ? `No ${title.toLowerCase()} match “${search.trim()}”.` : `No ${title.toLowerCase()} available.`}
            </p>
            {pageCount > 1 && (
              <nav aria-label="Pagination" className={styles.pagination}>
                <Button variant="outline" className={styles.control} disabled={loading || currentPage === 1} focusableWhenDisabled={loading}
                  onClick={() => setPage(currentPage - 1)}>Previous</Button>
                <span className={styles.pageNumber} aria-current="page">Page {currentPage} of {pageCount}</span>
                <Button variant="outline" className={styles.control} disabled={loading || currentPage === pageCount} focusableWhenDisabled={loading}
                  onClick={() => setPage(currentPage + 1)}>Next</Button>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}
