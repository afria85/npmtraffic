export function logApiEvent(payload: {
  requestId: string;
  route: string;
  status: number;
  ms: number;
  package?: string;
  days?: number;
  cacheStatus?: string;
  isStale?: boolean;
  staleReason?: string;
  upstreamStatus?: number;
}) {
  console.log(JSON.stringify(payload));
}
