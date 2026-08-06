import { createHash, timingSafeEqual } from 'crypto'

// Comparação em tempo constante (via sha256 pra normalizar o tamanho)
export function secureCompare(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
