import type { IconProps } from "./types";
import styles from "./ui.module.css";

const paths = {
  package: "M12 3 3 7.5v9L12 21l9-4.5v-9L12 3ZM3 7.5 12 12l9-4.5M12 12v9M7.5 5.25l9 4.5v4.5",
  "file-text": "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M8 13h8M8 17h6",
} satisfies Record<IconProps["name"], string>;

export function Icon({ name }: IconProps) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
      <path d={paths[name]} />
    </svg>
  );
}
