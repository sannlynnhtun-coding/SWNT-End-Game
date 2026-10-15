import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

await mkdir('public/icons', { recursive: true })
for (const [name, size, scale] of [
  ['icon-192', 192, .8],
  ['icon-512', 512, .8],
  ['maskable-512', 512, .6],
  ['apple-touch-icon', 180, .8],
]) {
  const artwork = await sharp('public/logo.png').resize(Math.round(size * scale), Math.round(size * scale), { fit: 'contain' }).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: '#090f18' } })
    .composite([{ input: artwork, gravity: 'centre' }]).png().toFile(`public/icons/${name}.png`)
}
