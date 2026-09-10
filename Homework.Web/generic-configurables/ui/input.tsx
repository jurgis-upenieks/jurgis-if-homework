"use client";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "cn";
import type { InputProps } from "./types";
import styles from "./ui.module.css";

export function Input({ className, ...props }: InputProps) {
  return (
    <span data-slot="input" className={cn(styles.input, className)}>
      <InputPrimitive className={styles.inputControl} {...props} />
    </span>
  );
}
