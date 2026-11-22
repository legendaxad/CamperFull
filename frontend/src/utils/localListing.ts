import type { CamperListing } from '@/types/camper'

/** Cover photo of a wizard listing (the photo flagged as cover, else the first one). */
export function localCover(listing: Pick<CamperListing, 'photos'>): string {
  return (listing.photos.find((p) => p.isCover) ?? listing.photos[0])?.src ?? ''
}
