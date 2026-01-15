export const config = {
  site: {
    name: "npmtraffic",
    tagline: "npm downloads, GitHub-style traffic view",
    url: "https://npmtraffic.com",
  },
  cache: {
    dailyTTLSeconds: 60 * 20, // 20 minutes
    metadataTTLSeconds: 60 * 60 * 24 * 7, // 7 days
  },
  limits: {
    compareMax: 5,
  },
} as const;
