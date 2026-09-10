export type CounterState = {
  count: number;
  note: string;
  increment: () => void;
  setNote: (note: string) => void;
};
