export const config = {
  site: {
    name: "npmtraffic",
    tagline: "npm downloads, GitHub-style traffic view",
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
