import { cn } from "cn";
import type { CardProps } from "./types";
import styles from "./ui.module.css";

export function Card({ title, children, className, ...props }: CardProps) {
  return (
    <article data-slot="card" className={cn(styles.card, className)} {...props}>
      <div className={styles.cardContent}>
        <h2 className={styles.cardTitle}>{title}</h2>
        {children}
      </div>
    </article>
  );
}
