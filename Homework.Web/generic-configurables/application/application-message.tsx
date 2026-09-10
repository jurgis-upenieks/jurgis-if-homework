"use client";

import { useId } from "react";
import { Button } from "../ui";
import type { ApplicationMessageProps } from "./types";
import styles from "./application.module.css";

export function ApplicationMessage({ title, children, action, alert = false }: ApplicationMessageProps) {
  const id = useId();

  return (
    <>
      <title>{title}</title>
      <main className={styles.messagePage} aria-labelledby={id}>
        <section className={styles.messageContent} role={alert ? "alert" : undefined}>
          <h1 id={id} className={styles.messageTitle}>{title}</h1>
          <p>{children}</p>
          {"href" in action ? <a className={styles.messageLink} href={action.href}>{action.label}</a> : <Button onClick={action.onClick}>{action.label}</Button>}
        </section>
      </main>
    </>
  );
}
