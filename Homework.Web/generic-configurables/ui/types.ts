import type { ComponentProps, ReactNode } from "react";
import type { Button } from "@base-ui/react/button";
import type { Input } from "@base-ui/react/input";

export type ButtonProps = Omit<ComponentProps<typeof Button>, "className"> & { className?: string; variant?: "default" | "outline" | "ghost" };

export type InputProps = Omit<ComponentProps<typeof Input>, "className"> & { className?: string; allowWhileLoading?: boolean };

export type CardProps = Omit<ComponentProps<"article">, "title"> & { title: ReactNode };

export type IconProps = { name: "package" | "file-text" };
