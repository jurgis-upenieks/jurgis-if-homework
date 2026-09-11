"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";
import { useLoadingInteraction } from "../query";
import type { InputProps } from "./types";
import styles from "./ui.module.css";

export function Input({ className, allowWhileLoading = false, ...props }: InputProps) {
  const loadingInteraction = useLoadingInteraction();
  const interactive = allowWhileLoading && !props.disabled;

  return (
    <span ref={interactive ? loadingInteraction : undefined} data-loading-interactive={interactive || undefined} data-slot="input" className={cn(styles.input, className)}>
      <InputPrimitive className={styles.inputControl} {...props} />
    </span>
  );
}
