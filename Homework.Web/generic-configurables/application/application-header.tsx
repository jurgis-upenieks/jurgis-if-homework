"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "../ui";
import type { ApplicationHeaderProps } from "./types";
import styles from "./application.module.css";

export function ApplicationHeader({ name, navigation: links, contentId }: ApplicationHeaderProps) {
  const pathname = usePathname() ?? "/";

  return (
    <>
      <a href={`#${contentId}`} className={styles.skipLink}>Skip to content</a>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link className={styles.name} href="/">
            <span aria-hidden="true" className={styles.brandMark}>{name.charAt(0)}</span>
            {name}
          </Link>
          <nav aria-label="Main navigation" className={styles.navigation}>
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
