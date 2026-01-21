import { cacheGetWithStale, cacheSetWithStale } from "@/lib/cache";
import { normalizePackageInput } from "@/lib/package-name";

const FRESH_TTL_SECONDS = 60 * 15;
const STALE_TTL_SECONDS = 60 * 60 * 24;

export type SearchItem = {
  name: string;
  description?: string;
  score?: number;
};

export type SearchResponse = {
  query: string;
  items: SearchItem[];
  meta: {
    fetchedAt: string;
    cacheStatus: "HIT" | "MISS" | "STALE";
  };
};

type SearchCacheValue = {
  query: string;
  items: SearchItem[];
  fetchedAt: string;
};

function buildCacheKey(query: string, limit: number) {
  return `search:${query.toLowerCase()}:${limit}`;
}

export async function fetchSearch(queryInput: string, limit = 10): Promise<SearchResponse> {
  const query = normalizePackageInput(queryInput);
  if (!query) {
    return {
      query,
      items: [],
      meta: { fetchedAt: new Date().toISOString(), cacheStatus: "MISS" },
    };
  }

  const key = buildCacheKey(query, limit);
  const cached = cacheGetWithStale<SearchCacheValue>(key);
  if (cached.hit && cached.value && !cached.stale) {
    return {
      query: cached.value.query,
      items: cached.value.items,
      meta: {
        fetchedAt: cached.value.fetchedAt,
        cacheStatus: "HIT",
      },
    };
  }

  const url = new URL("https://registry.npmjs.org/-/v1/search");
  url.searchParams.set("text", query);
  url.searchParams.set("size", String(limit));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        accept: "application/json",
        "user-agent": "npmtraffic/0.2.6 (https://npmtraffic.com)",
      },
    });

    if (!res.ok) {
      throw new Error(`UPSTREAM_${res.status}`);
    }

    const payload = (await res.json()) as {
      objects?: Array<{
        package?: { name?: string; description?: string };
        score?: { final?: number };
      }>;
    };

    const items: SearchItem[] = (payload.objects ?? [])
      .map((entry) => ({
        name: entry.package?.name ?? "",
        description: entry.package?.description,
        score: entry.score?.final,
      }))
      .filter((item) => item.name);

    const fetchedAt = new Date().toISOString();
    cacheSetWithStale(
      key,
      { query, items, fetchedAt },
      FRESH_TTL_SECONDS,
      STALE_TTL_SECONDS
    );

    return {
      query,
      items,
      meta: { fetchedAt, cacheStatus: "MISS" },
    };
  } catch {
    if (cached.hit && cached.value) {
      return {
        query: cached.value.query,
        items: cached.value.items,
        meta: {
          fetchedAt: cached.value.fetchedAt,
          cacheStatus: "STALE",
        },
      };
    }
    throw new Error("UPSTREAM_UNAVAILABLE");
  }
}
