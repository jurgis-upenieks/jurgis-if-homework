import type { DehydratedState } from "@tanstack/react-query";
import type { ApplicationState, ApplicationStateScope } from "../types";

export type UpdateSession = {
  snapshot: UpdateSnapshot | null;
  state: ApplicationStateScope;
};

export type UpdateSnapshot = {
  schema: 1;
  url: string;
  savedAt: number;
  states: Record<string, ApplicationState>;
  queries: DehydratedState;
  view: {
    scroll: Record<string, [number, number]>;
    focus: string | null;
    selection: [number, number, NonNullable<HTMLInputElement["selectionDirection"]>] | null;
  };
};
