"use client";

import { ApplicationDocument } from "./application-layout";
import { ApplicationMessage } from "./application-message";
import type { ApplicationErrorProps } from "./types";

export function ApplicationError({ retry }: ApplicationErrorProps) {
  return (
    <ApplicationMessage title="Something went wrong" alert action={{ label: "Try again", onClick: retry }}>
      Please try again in a moment.
    </ApplicationMessage>
  );
}

export function ApplicationGlobalError(props: ApplicationErrorProps) {
  return <ApplicationDocument><ApplicationError {...props} /></ApplicationDocument>;
}
