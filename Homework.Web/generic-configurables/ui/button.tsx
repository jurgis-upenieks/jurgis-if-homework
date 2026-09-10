"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "cn";
import type { ButtonProps } from "./types";
import styles from "./ui.module.css";

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return <ButtonPrimitive data-slot="button" data-variant={variant} className={cn(styles.button, className)} {...props} />;
}
