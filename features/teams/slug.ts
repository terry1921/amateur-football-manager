const MAX_BASE_SLUG_LENGTH = 60;

export function slugifyTeamName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE_SLUG_LENGTH)
    .replace(/-+$/g, "");

  return slug || "team";
}

export function slugCandidate(baseSlug: string, attempt: number) {
  return attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
}
