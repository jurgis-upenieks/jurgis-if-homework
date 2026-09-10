"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CatalogProps } from "./types";
import styles from "./catalog.module.css";

export function Catalog({ name, title, trendingLabel = "Trending item", missingDetail = "Not specified", pageSize = 12, currency = "EUR", data, failed = false }: CatalogProps) {
  const id = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const headerContent = useRef<HTMLDivElement>(null);
  const brand = useRef<HTMLAnchorElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const restoreNavigationFocus = useRef(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compactNavigation, setCompactNavigation] = useState(true);
  const query = search.trim().toLocaleLowerCase("en");
  const items = data?.items.filter((item) => item.title.toLocaleLowerCase("en").includes(query)) ?? [];
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 12;
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * size;
  const visibleItems = items.slice(start, start + size);
  const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const loading = !data && !failed;

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
                disabled={!data}
                aria-controls={data ? `${id}-items` : undefined}
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
        {loading ? (
          <p role="status">Loading {title.toLowerCase()}…</p>
        ) : failed ? (
          <section role="alert" className={styles.message}>
            <h2 className={styles.cardTitle}>We couldn’t load {title.toLowerCase()}.</h2>
            <p>Please try again in a moment.</p>
            <Button variant="outline" className={styles.control} onClick={() => window.location.reload()}>Try again</Button>
          </section>
        ) : (
          <>
            <ul id={`${id}-items`} role="list" aria-label={title} className={styles.grid}>
              {visibleItems.map((item) => (
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
              {items.length ? `${start + 1}–${Math.min(start + size, items.length)} of ${items.length} ${title.toLowerCase()}` :
                query ? `No ${title.toLowerCase()} match “${search.trim()}”.` : `No ${title.toLowerCase()} available.`}
            </p>
            {pageCount > 1 && (
              <nav aria-label="Pagination" className={styles.pagination}>
                <Button variant="outline" className={styles.control} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
                <span className={styles.pageNumber} aria-current="page">Page {currentPage} of {pageCount}</span>
                <Button variant="outline" className={styles.control} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button>
              </nav>
            )}
          </>
        )}
      </main>
      <footer className={styles.footer}>
        <p>{name}</p>
      </footer>
    </div>
  );
}
