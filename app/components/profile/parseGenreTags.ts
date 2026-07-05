export function parseGenreTags(genre: string | null | undefined): string[] {
  if (!genre?.trim()) {
    return [];
  }

  return [...new Set(genre.split(/[,·/|]+/).map((part) => part.trim()).filter(Boolean))];
}
