import type { ReactNode } from "react";

export type ApplicationMessageProps = {
  title: string;
  children: ReactNode;
  action: { label: string; href: string } | { label: string; onClick: () => void };
  alert?: boolean;
};

export type ApplicationErrorProps = { retry: () => void };
