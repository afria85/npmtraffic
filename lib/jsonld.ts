export function homepageJsonLd(baseUrl: string, searchEndpoint = "/p/{search_term_string}") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: baseUrl,
    name: "npmtraffic",
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}${searchEndpoint}`,
      "query-input": "required name=search_term_string",
    },
  };
}
