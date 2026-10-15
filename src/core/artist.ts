export function primaryArtist(artist: string): string {
  return artist.split(/\s*(?:,|&|\bfeat\.?|\bft\.?|\bx\b|\bwith\b)\s*/i)[0]?.trim() || artist
}

export function artistNames(artist: string): string[] {
  return artist.split(/\s*(?:,|&|\bfeat\.?|\bft\.?|\bx\b|\bwith\b)\s*/i).map((name) => name.trim().toLowerCase()).filter(Boolean)
}

export function artistKey(artist: string): string {
  return primaryArtist(artist).toLowerCase()
}
