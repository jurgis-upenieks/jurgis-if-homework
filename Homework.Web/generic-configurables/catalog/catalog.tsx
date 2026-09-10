"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CatalogProps } from "./types";
import styles from "./catalog.module.css";

export function Catalog({ name, title, trendingLabel = "Trending item", missingDetail = "Not specified", pageSize = 12, currency = "EUR", data, failed = false }: CatalogProps) {
  const id = useId();
  const searchInput = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const query = search.trim().toLocaleLowerCase("en");
  const items = data?.items.filter((item) => item.title.toLocaleLowerCase("en").includes(query)) ?? [];
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 12;
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * size;
  const visibleItems = items.slice(start, start + size);
  const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const loading = !data && !failed;

  return (
    <div className={styles.page}>
      <a href={`#${id}-main`} className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link className={styles.name} href="/">
            <span aria-hidden="true" className={styles.brandMark}>{name.charAt(0)}</span>
            {name}
          </Link>
          <Button
            variant="outline"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls={`${id}-navigation`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            Menu
          </Button>
          <nav id={`${id}-navigation`} aria-label="Main navigation" className={cn(styles.navigation, menuOpen && styles.navigationOpen)}>
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
                  <Card className={styles.card}>
                    <CardContent className={styles.cardContent}>
                      <h2 className={styles.cardTitle}>{item.title}</h2>
                      <p className={styles.details}>
                        <span className={styles.detail}>{item.detail ?? missingDetail}</span>
                        <span className={styles.price}>{formatter.format(item.amount)}</span>
                      </p>
                    </CardContent>
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
