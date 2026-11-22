import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES } from '@/constants/camper'
import { formatBytes } from './format'

export function validateImageFile(
  file: File,
  maxBytes = MAX_PHOTO_BYTES,
  types: readonly string[] = ACCEPTED_PHOTO_TYPES,
): string | null {
  if (!types.includes(file.type)) {
    return `"${file.name}" is not a supported image. Use ${types.map((t) => t.replace('image/', '').toUpperCase()).join(', ')}.`
  }
  if (file.size > maxBytes) {
    return `"${file.name}" is ${formatBytes(file.size)} — the limit is ${formatBytes(maxBytes)}.`
  }
  return null
}

export interface CompressedImage {
  dataUrl: string
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('The image could not be read.'))
    img.src = src
  })
}

/**
 * Downscales an image (via an object URL) into a compact JPEG data URL.
 * Wizard photos are persisted in localStorage (~5 MB quota), so a compressed copy is kept.
 * Used by the local-only listing wizard (the backend has no customer listing endpoint).
 */
export async function compressImage(
  objectUrl: string,
  maxDimension = 1100,
  quality = 0.72,
): Promise<CompressedImage> {
  const img = await loadImage(objectUrl)
  const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.round(img.naturalWidth * scale)
  const height = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image processing is not supported in this browser.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), width, height }
}

/** Approximate decoded byte size of a base64 data URL. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.round((base64.length * 3) / 4)
}
