export type RangeDropdownItem = {
  days: number;
  href: string;
};

export type RangeDropdownProps = {
  currentDays: number;
  items: RangeDropdownItem[];
};

export type RangeSelectorProps = {
  currentDays: number;
  getHref: (days: number) => string;
  label?: string;
};
