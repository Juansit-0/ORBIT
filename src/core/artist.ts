export function primaryArtist(artist: string): string {
  return artist.split(/\s*(?:,|&|\bfeat\.?|\bft\.?|\bx\b|\bwith\b)\s*/i)[0]?.trim() || artist
}

export function artistKey(artist: string): string {
  return primaryArtist(artist).toLowerCase()
}
