export function logApiEvent(payload: {
  requestId: string;
  route: string;
  status: number;
  ms: number;
  upstreamStatus?: number;
}) {
  console.log(JSON.stringify(payload));
}
