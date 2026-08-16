import { supabase, isCloudMode } from '../../lib/supabase'

/** Photos are stored square and small — cards are tiny, and the free tier is 1 GB. */
const OUTPUT_SIZE = 600

export type StoredPhoto = { url: string; path: string | null }

/**
 * Centre-crops to a square and downscales before upload. Doing this client-side means a
 * 5 MB phone photo becomes small, so the roster stays fast to load over mobile data.
 *
 * Output is PNG, not JPEG: JPEG has no alpha channel, so a transparent-background photo
 * (a cutout, a sticker) would get its transparent pixels filled in as solid black by the
 * encoder. PNG keeps the transparency and lets the card's own background show through.
 */
export async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const sx = (bitmap.width - side) / 2
  // Bias the crop upward: faces sit in the top half, and the card shows the top anyway.
  const sy = Math.min((bitmap.height - side) / 2, bitmap.height * 0.1)

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('No se pudo procesar la imagen')
  return blob
}

export async function uploadPhoto(file: File, playerId: string): Promise<StoredPhoto> {
  const blob = await prepareImage(file)

  if (!isCloudMode) {
    // Local mode has nowhere to upload to, so the image rides along as a data URL.
    // Fine for a handful of players; cloud mode is the real answer.
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
      reader.readAsDataURL(blob)
    })
    return { url, path: null }
  }

  // A fresh name per upload dodges the CDN cache that would otherwise keep showing
  // the old photo after a replacement.
  const path = `${playerId}/${Date.now()}.png`
  const { error } = await supabase!.storage
    .from('player-photos')
    .upload(path, blob, { contentType: 'image/png', upsert: true })
  if (error) throw error

  const { data } = supabase!.storage.from('player-photos').getPublicUrl(path)
  return { url: data.publicUrl, path }
}

/** Best-effort cleanup of a replaced photo; failing to delete must not fail the save. */
export async function deletePhoto(path: string | null) {
  if (!path || !isCloudMode) return
  await supabase!.storage.from('player-photos').remove([path]).catch(() => {})
}
