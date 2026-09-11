import type { ComponentProps, ReactNode } from "react";
import type { Button } from "@base-ui/react/button";

export type ButtonProps = Button.Props & { className?: string; variant?: "default" | "outline" | "ghost" };

export type InputProps = ComponentProps<"input"> & { allowWhileLoading?: boolean };

export type CardProps = Omit<ComponentProps<"article">, "title"> & { title: ReactNode };

export type IconProps = { name: "package" | "file-text" };
