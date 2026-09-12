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

export type ApplicationState = Record<string, ApplicationStateValue>;


export type ApplicationNavigationState = { menuOpen: boolean };

export type ApplicationTextTooltipState = { anchor: HTMLElement; text: string };

type ApplicationStateValue = string | number | boolean | null | ApplicationStateValue[] | { [key: string]: ApplicationStateValue };

export type ApplicationStateScope = {
  saved: Map<string, ApplicationState>;
  readStates: Map<string, () => ApplicationState>;
};
