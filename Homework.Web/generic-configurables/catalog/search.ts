export function normalizeSearchText(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en");
}

export function getSearchTokens(value: string) {
  return Array.from(new Set(normalizeSearchText(value).split(/\s+/u).filter(Boolean))).toSorted();
}
