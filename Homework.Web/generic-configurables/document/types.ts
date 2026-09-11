import type { ApplicationHeaderProps } from "../application";

export type DocumentPageProps = Omit<ApplicationHeaderProps, "contentId"> & {
  title: string;
  source: string;
};
