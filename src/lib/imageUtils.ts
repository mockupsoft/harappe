/**
 * Generates a thematic placeholder image URL based on content name and category.
 * Uses picsum.photos with a descriptive seed to ensure thematic consistency.
 */
export function getPlaceholderImage(name: string, category: string): string {
  const seed = `${category}-${name}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `https://picsum.photos/seed/${seed}/600/600`;
}
