export interface StampRow {
  id: string
  created_at: string
}

export interface RedemptionRow {
  id: string
  redeemed_at: string
}

export function countActiveStamps(
  stamps: StampRow[],
  redemptions: RedemptionRow[]
): number {
  if (redemptions.length === 0) return stamps.length

  const lastRedemptionDate = redemptions
    .map(r => new Date(r.redeemed_at))
    .reduce((latest, d) => (d > latest ? d : latest), new Date(0))

  return stamps.filter(s => new Date(s.created_at) > lastRedemptionDate).length
}

export function isRewardReady(activeStamps: number, stampsRequired: number): boolean {
  return activeStamps >= stampsRequired
}
