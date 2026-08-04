import { isAddress } from 'viem'

export type ParsedCsvRow = {
  lineNumber: number // 1-indexed line in the original text
  recipient: string
  amountStr: string
  // Present only when the row is fully valid.
  recipient0x?: `0x${string}`
  amount?: bigint
  error?: string
}

const HEADER_RE = /address|recipient|wallet|amount|seat|qty|quantity/i

/**
 * Parse pasted / uploaded CSV of "address,quantity" rows for a batch buy.
 *
 * - One recipient per line; fields separated by comma, semicolon, tab, or
 *   whitespace. Blank lines are ignored.
 * - A leading header row (e.g. "address,amount") is skipped automatically.
 * - Every non-blank, non-header line becomes a row — invalid ones carry an
 *   `error` so the UI can point at the exact line rather than silently drop it
 *   (the contract reverts the whole batch on any bad entry anyway).
 * - Addresses are validated with viem's `isAddress` (checksum-strict, matching
 *   the single-buy form). Quantities must be positive whole numbers.
 */
export function parseRecipientsCsv(text: string): ParsedCsvRow[] {
  const rows: ParsedCsvRow[] = []
  const lines = text.split(/\r?\n/)

  lines.forEach((raw, i) => {
    const trimmed = raw.trim()
    if (trimmed === '') return

    const parts = trimmed.split(/[,;\t\s]+/).map(s => s.trim()).filter(Boolean)
    const recipient = parts[0] ?? ''
    const amountStr = parts[1] ?? ''

    // Skip a header line: only when nothing on it looks like an address and it
    // reads like column names. Never skip a line that could be real data.
    if (rows.length === 0 && !isAddress(recipient) && HEADER_RE.test(trimmed)) return

    const row: ParsedCsvRow = { lineNumber: i + 1, recipient, amountStr }

    if (!isAddress(recipient)) {
      row.error = 'Invalid address'
    } else if (amountStr === '') {
      row.error = 'Missing quantity'
    } else if (!/^\d+$/.test(amountStr) || BigInt(amountStr) < 1n) {
      row.error = 'Quantity must be a whole number ≥ 1'
    } else {
      row.recipient0x = recipient as `0x${string}`
      row.amount = BigInt(amountStr)
    }

    rows.push(row)
  })

  return rows
}
