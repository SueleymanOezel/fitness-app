/**
 * A phone photo is 3-5 MB and the free storage tier holds 1 GB — unthrottled it
 * would be full after roughly 200 photos. Downscaled, several thousand fit.
 */
export const MAX_EDGE = 1600

/** Pure on purpose: jsdom has no canvas, so this is the part that can be tested. */
export function fitWithin(width: number, height: number, max: number) {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const factor = max / longest
  return {
    // Never zero: a canvas dimension of 0 throws, and an extreme aspect ratio
    // would round the short edge away.
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  }
}

/**
 * Thin glue around the browser APIs, deliberately untested: jsdom implements
 * neither createImageBitmap nor canvas, so a test here would only assert mocks.
 */
export async function resizeToJpeg(file: File, max = MAX_EDGE, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, max)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvas unavailable')
    context.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    )
    if (!blob) throw new Error('encode failed')
    return blob
  } finally {
    // Released either way: an un-closed bitmap holds the decoded frame in memory.
    bitmap.close()
  }
}
