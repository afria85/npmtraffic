"use client";

import dynamic from "next/dynamic";
import ChartSkeleton from "@/components/charts/ChartSkeleton";

// NOTE: next/dynamic({ ssr:false }) is only allowed inside Client Components.
// This wrapper lets Server Components import the chart safely.
const CompareChart = dynamic(() => import("@/components/compare/CompareChart"), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export default CompareChart;
