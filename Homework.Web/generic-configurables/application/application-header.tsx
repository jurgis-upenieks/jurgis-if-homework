"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Icon } from "../ui";
import type { ApplicationHeaderProps } from "./types";
import styles from "./application.module.css";

export function ApplicationHeader({ name, navigation: links, contentId }: ApplicationHeaderProps) {
  const id = useId();
  const pathname = usePathname() ?? "/";
  const headerContent = useRef<HTMLDivElement>(null);
  const brand = useRef<HTMLAnchorElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const restoreNavigationFocus = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [compactNavigation, setCompactNavigation] = useState(true);

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
    <>
      <a href={`#${contentId}`} className={styles.skipLink}>Skip to content</a>
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
            {links.map(({ label, href, icon }) => (
              <Link key={href} className={styles.navigationLink} href={href} aria-current={pathname === href ? "page" : undefined}>
                {icon && <Icon name={icon} />}
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
