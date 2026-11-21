"use client";

import dynamic from "next/dynamic";
import ChartSkeleton from "@/components/charts/ChartSkeleton";

// NOTE: next/dynamic({ ssr:false }) is only allowed inside Client Components.
// This wrapper lets Server Components import the chart safely.
const CompareChart = dynamic(() => import("@/components/compare/CompareChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

// Changing the package set must start a new chart settings instance. Otherwise
// a client navigation reuses the previous set's colors and new lines fall back
// to the same palette entry (formerly slate).
export default function CompareChartClient(props: React.ComponentProps<typeof CompareChart>) {
  return <CompareChart key={props.packageNames.join("|")} {...props} />;
}
