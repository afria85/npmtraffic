export const config = {
  site: {
    name: "npmtraffic",
    tagline: "npm downloads, GitHub-style traffic view",
    url: "https://npmtraffic.com",
  },
  cache: {
    dailyTTLSeconds: 60 * 60 * 6, // 6 hours
    metadataTTLSeconds: 60 * 60 * 24 * 7, // 7 days
  },
  limits: {
    compareMax: 5,
  },
} as const;
