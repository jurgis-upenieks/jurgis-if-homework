import type { ReactNode } from "react";
import type { IconProps } from "../ui";

export type ApplicationHeaderProps = {
  name: string;
  navigation: { label: string; href: string; icon?: IconProps["name"] }[];
  contentId: string;
};

export type ApplicationMessageProps = {
  title: string;
  children: ReactNode;
  action: { label: string; href: string } | { label: string; onClick: () => void };
  alert?: boolean;
};

export type ApplicationErrorProps = { retry: () => void };
