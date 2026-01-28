export const config = {
  site: {
    name: "npmtraffic",
    tagline: "Track npm package downloads with daily precision, export data with full metadata, and mark important events.",
    url: "https://npmtraffic.com",
  },
  cache: {
    dailyTTLSeconds: 60 * 15, // 15 minutes
    metadataTTLSeconds: 60 * 60 * 24 * 7, // 7 days
    validatePositiveTTLSeconds: 60 * 60 * 24, // 24 hours
    validateNegativeTTLSeconds: 60 * 60, // 1 hour
  },
  limits: {
    compareMax: 5,
  },
} as const;
