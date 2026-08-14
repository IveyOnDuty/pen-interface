/**
 * One-off helper: upscale public/favicon-32.png to a square Snapshot avatar PNG.
 * Run: node scripts/export-avatar.mjs
 */
import sharp from 'sharp'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'public/favicon-32.png')
const out = join(root, 'public/shutter-pen-avatar-512.png')

const PAD = 0.12
const size = Math.round(32 / (1 - 2 * PAD))
const logo = 32
const offset = Math.round((size - logo) / 2)

await sharp({
  create: {
    width: size,
    height: size,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: src, left: offset, top: offset }])
  .resize(512, 512)
  .png()
  .toFile(out)

const meta = await sharp(out).metadata()
console.log(`Wrote ${out} (${meta.width}×${meta.height})`)
