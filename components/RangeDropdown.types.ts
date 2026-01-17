export type RangeSelectorProps = {
  currentDays: number;
  getHref: (days: number) => string;
  label?: string;
};
