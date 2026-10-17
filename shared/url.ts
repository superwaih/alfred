/**
 * Formats a web address as a full URL: "linkedin.com/in/ada" becomes
 * "https://linkedin.com/in/ada". Addresses that already have a scheme are
 * left as written (an explicit http:// may be the only way a site works).
 */
export function formatUrl(raw: string): string {
  const value = raw.trim().replace(/\s+/g, "");
  if (!value) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[^:]+:\d/.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

/** The profile's links, each formatted as a full URL. */
export function formatLinks<T extends Record<string, string>>(links: T): T {
  return Object.fromEntries(Object.entries(links).map(([key, value]) => [key, formatUrl(value)])) as T;
}
