export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') 
    image.src = url
  })

export async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  // Acotar la salida a MAX_LADO px (manteniendo proporción). Sin esto, un recorte
  // de una foto de cámara se guardaba a resolución completa y pesaba varios MB en
  // base64; ~512 px basta para un avatar nítido y deja la foto en ~30–60 KB.
  const MAX_LADO = 512
  const escala = Math.min(1, MAX_LADO / Math.max(pixelCrop.width, pixelCrop.height))
  const w = Math.round(pixelCrop.width * escala)
  const h = Math.round(pixelCrop.height * escala)

  canvas.width = w
  canvas.height = h

  // draw image to canvas (recorta la región seleccionada y la escala a w×h)
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    w,
    h
  )

  // Return as Base64 string
  return canvas.toDataURL('image/jpeg', 0.85)
}
