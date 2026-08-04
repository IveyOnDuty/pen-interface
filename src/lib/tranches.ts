export type TrancheSegment = {
  trancheIndex: number
  seats: bigint
  pricePerSeat: bigint
  subtotal: bigint
}

/**
 * Split a purchase of `quantity` seats across tranches starting from
 * `soldAtStart` (the current total supply), mirroring the on-chain bonding
 * curve: each tranche fills up to its `upperBound` at its flat `pricePerSeat`
 * before the next one starts. Used only for the cost breakdown display; the
 * authoritative total always comes from the contract's `quotePurchase`.
 */
export function splitAcrossTranches(
  quantity: bigint,
  soldAtStart: bigint,
  tranches: { upperBound: bigint; pricePerSeat: bigint }[],
): TrancheSegment[] {
  const segments: TrancheSegment[] = []
  let remaining = quantity
  let cursor = soldAtStart
  for (let i = 0; i < tranches.length && remaining > 0n; i++) {
    const t = tranches[i]
    if (cursor >= t.upperBound) continue
    const availableInTranche = t.upperBound - cursor
    const seatsHere = remaining < availableInTranche ? remaining : availableInTranche
    if (seatsHere > 0n) {
      segments.push({
        trancheIndex: i,
        seats: seatsHere,
        pricePerSeat: t.pricePerSeat,
        subtotal: seatsHere * t.pricePerSeat,
      })
    }
    remaining -= seatsHere
    cursor += seatsHere
  }
  return segments
}
