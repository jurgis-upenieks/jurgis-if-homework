import type { PropsWithChildren } from "react";
import { Geist } from "next/font/google";
import { ApplicationProviders } from "./application-providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export function ApplicationDocument({ children }: PropsWithChildren) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}

export function ApplicationLayout({ children }: PropsWithChildren) {
  return <ApplicationDocument><ApplicationProviders>{children}</ApplicationProviders></ApplicationDocument>;
}
