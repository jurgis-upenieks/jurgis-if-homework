import type { ApplicationHeaderProps } from "@/generic-configurables/application";

export const site = {
  name: "Homework2",
  navigation: [
    { label: "Products", href: "/", icon: "package" },
    { label: "Technical details", href: "/technical-details", icon: "file-text" },
  ],
} satisfies Omit<ApplicationHeaderProps, "contentId">;
