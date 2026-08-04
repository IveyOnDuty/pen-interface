import { useState, useRef, useMemo, useEffect } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { useMultiBuySeats } from '../../hooks/useMultiBuySeats'
import { useDashboard } from '../../hooks/useDashboard'
import { useTranches } from '../../hooks/useTranches'
import { formatAsset, formatSeats } from '../../lib/format'
import { splitAcrossTranches } from '../../lib/tranches'
import { parseRecipientsCsv } from '../../lib/csv'
import { getExplorerUrl } from '../../config/constants'

const PLACEHOLDER = `0x1234…abcd,5
0xabcd…5678,2
0x9876…4321,10`

export function MultiBuyForm() {
  const { address } = useAccount()
  const chainId = useChainId()
  const explorerUrl = getExplorerUrl(chainId)

  const [text, setText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // CSV-format help popover, dismissed by clicking outside it.
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showInfo) return
    function onClick(e: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setShowInfo(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [showInfo])

  const parsed = useMemo(() => parseRecipientsCsv(text), [text])
  const validRows = parsed.filter(r => r.error === undefined)
  const errorRows = parsed.filter(r => r.error !== undefined)

  const recipients = validRows.map(r => r.recipient0x!)
  const amounts = validRows.map(r => r.amount!)

  // Duplicate recipients are allowed on-chain (mints accumulate) — just flag it.
  const duplicateCount = useMemo(() => {
    const seen = new Set<string>()
    let dupes = 0
    for (const r of recipients) {
      const key = r.toLowerCase()
      if (seen.has(key)) dupes++
      else seen.add(key)
    }
    return dupes
  }, [recipients])

  const {
    totalSeats,
    quotedCost, balance,
    quoteFailed, quotePending, insufficientBalance,
    asset,
    step, approveLoading, purchaseLoading,
    purchaseTxHash,
    errorMsg, approve, purchase, reset, clearError,
  } = useMultiBuySeats(recipients, amounts)

  const d = useDashboard()
  const { tranches } = useTranches(d.trancheCount)

  const ASSET_SYMBOL = asset?.symbol ?? '…'
  const ASSET_DECIMALS = asset?.decimals ?? 6

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
    // Allow re-selecting the same file later.
    e.target.value = ''
  }

  function resetForm() {
    setText('')
    reset()
  }

  const segments =
    d.totalSupply !== undefined && tranches.length > 0 && totalSeats > 0n
      ? splitAcrossTranches(totalSeats, d.totalSupply, tranches)
      : []

  const isLoading = approveLoading || purchaseLoading
  const noValidRows = validRows.length === 0
  const hasErrors = errorRows.length > 0

  if (step === 'success') {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-3">✓</div>
        <div className="text-lg font-semibold text-bone-950 mb-1">Batch purchase complete</div>
        <div className="text-sm text-bone-500 mb-4">
          {formatSeats(totalSeats)} SEAT{totalSeats !== 1n ? 's' : ''} sent to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}.
        </div>
        {explorerUrl && purchaseTxHash && (
          <a
            href={`${explorerUrl}/tx/${purchaseTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-brand-600 hover:text-brand-700 font-mono mb-6"
          >
            {purchaseTxHash.slice(0, 10)}…{purchaseTxHash.slice(-6)} ↗
          </a>
        )}
        <div>
          <button onClick={resetForm} className="text-brand-600 hover:text-brand-700 text-sm font-medium">
            Buy more SEATs
          </button>
        </div>
      </div>
    )
  }

  const needsApprove = step === 'needs-approve' || step === 'approving'

  return (
    <div className="space-y-5">
      {/* Balance */}
      {balance !== undefined && (
        <div className="text-xs text-bone-500">
          Wallet balance: <span className="text-bone-700 font-medium">{formatAsset(balance, ASSET_DECIMALS, ASSET_SYMBOL)}</span>
        </div>
      )}

      {/* CSV input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-bone-700">Recipients (CSV)</label>
          <div className="flex items-center gap-2">
            <div className="relative" ref={infoRef}>
              <button
                type="button"
                onClick={() => setShowInfo(v => !v)}
                aria-label="CSV format help"
                aria-expanded={showInfo}
                className="w-5 h-5 flex items-center justify-center rounded-full border border-bone-300 text-bone-500 text-[11px] font-semibold leading-none hover:text-bone-700 hover:border-bone-400 transition-colors"
              >
                i
              </button>
              {showInfo && (
                <div className="absolute right-0 top-7 z-10 w-72 rounded-lg border border-bone-200 bg-bone-50 p-3.5 shadow-lg text-xs text-bone-600">
                  <div className="text-bone-950 font-semibold mb-1.5">CSV format</div>
                  <p className="mb-2">
                    One recipient per line, as{' '}
                    <span className="font-mono text-bone-800">address,quantity</span>:
                  </p>
                  <pre className="rounded-md bg-bone-100 border border-bone-200 px-2.5 py-2 mb-2.5 font-mono text-[11px] text-bone-700 whitespace-pre overflow-x-auto">
{`0x5B38Da…beddC4,5
0xAb8483…35cb2,2`}
                  </pre>
                  <ul className="space-y-1 list-disc pl-4">
                    <li>Separate the two values with a comma, space, semicolon, or tab.</li>
                    <li>A header row (e.g. <span className="font-mono">address,quantity</span>) is skipped automatically.</li>
                    <li>Blank lines are ignored.</li>
                    <li>Quantity must be a whole number of 1 or more.</li>
                    <li>The same address can appear more than once; its quantities add up.</li>
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Upload .csv
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        </div>
        <p className="text-xs text-bone-500 mb-2">
          One recipient per line: <span className="font-mono text-bone-700">address,quantity</span>. Paste below or upload a file. You pay from your wallet.
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          spellCheck={false}
          rows={6}
          className="w-full text-sm font-mono rounded-lg border border-bone-300 bg-bone-50 text-bone-950 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-moss-500 resize-y"
        />
      </div>

      {/* Parse summary + preview */}
      {parsed.length > 0 && (
        <div className="rounded-xl bg-bone-50 border border-bone-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 text-xs border-b border-bone-200">
            <span className="text-bone-700 font-medium">
              {validRows.length} valid recipient{validRows.length !== 1 ? 's' : ''}
            </span>
            {hasErrors && (
              <span className="text-red-600 font-medium">{errorRows.length} line{errorRows.length !== 1 ? 's' : ''} to fix</span>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-bone-100">
            {parsed.map(r => (
              <div
                key={r.lineNumber}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs ${r.error ? 'bg-red-50' : ''}`}
              >
                <span className="text-bone-400 tabular-nums w-6 shrink-0">{r.lineNumber}</span>
                <span className={`font-mono flex-1 truncate ${r.error ? 'text-red-700' : 'text-bone-700'}`}>
                  {r.recipient || <span className="italic text-bone-400">(empty)</span>}
                </span>
                {r.error ? (
                  <span className="text-red-600 shrink-0">{r.error}</span>
                ) : (
                  <span className="text-bone-700 tabular-nums shrink-0">{formatSeats(r.amount!)} SEAT{r.amount !== 1n ? 's' : ''}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate notice */}
      {duplicateCount > 0 && !hasErrors && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-700">
          {duplicateCount} duplicate recipient{duplicateCount !== 1 ? 's' : ''} — quantities for the same address will be added together.
        </div>
      )}

      {/* Quote failed — not enough seats available */}
      {quoteFailed && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700">
          Not enough SEATs available for this batch. Reduce quantities.
        </div>
      )}

      {/* Per-tranche breakdown (aggregate across the whole batch) */}
      {segments.length > 0 && !quoteFailed && (
        <div className="rounded-xl bg-bone-50 border border-bone-200 p-4">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1.5 text-xs">
            <div className="text-bone-500 uppercase tracking-wide font-medium">Tranche</div>
            <div />
            <div className="text-bone-500 uppercase tracking-wide font-medium text-right">SEATs</div>
            <div className="text-bone-500 uppercase tracking-wide font-medium text-right">Price / SEAT</div>

            {segments.map(seg => (
              <div key={seg.trancheIndex} className="contents text-bone-700">
                <div>T{seg.trancheIndex + 1}</div>
                <div />
                <div className="text-right tabular-nums">{formatSeats(seg.seats)}</div>
                <div className="text-right tabular-nums">{formatAsset(seg.pricePerSeat, ASSET_DECIMALS, ASSET_SYMBOL)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totals */}
      {totalSeats > 0n && (
        <div className="rounded-xl bg-bone-50 border border-bone-200 p-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-bone-500">Total SEATs</span>
            <span className="text-bone-700 tabular-nums font-medium">{formatSeats(totalSeats)} to {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}</span>
          </div>
          {quotedCost !== undefined && (
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-bone-700">You pay</span>
              <span className="text-bone-950 tabular-nums">{formatAsset(quotedCost, ASSET_DECIMALS, ASSET_SYMBOL)}</span>
            </div>
          )}
        </div>
      )}

      {/* Insufficient balance warning */}
      {insufficientBalance && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          Insufficient {ASSET_SYMBOL} balance.
        </div>
      )}

      {/* Step indicator */}
      {needsApprove && (
        <div className="flex items-center gap-3 text-xs text-bone-500">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-moss-500 text-bone-950 flex items-center justify-center text-[10px] font-bold">1</span>
            Approve {ASSET_SYMBOL}
          </div>
          <div className="flex-1 border-t border-dashed border-bone-300" />
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-bone-200 text-bone-500 flex items-center justify-center text-[10px] font-bold">2</span>
            Purchase
          </div>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 flex items-start justify-between gap-3">
          <span className="flex-1">{errorMsg}</span>
          <button
            onClick={clearError}
            aria-label="Dismiss error"
            className="text-red-600 hover:text-red-800 font-bold leading-none pt-0.5"
          >
            ×
          </button>
        </div>
      )}

      {/* Action button */}
      {!address ? (
        <button
          disabled
          className="w-full py-3 rounded-xl font-semibold text-sm bg-moss-500 disabled:opacity-50 disabled:cursor-not-allowed text-bone-950 transition-all"
        >
          Connect wallet
        </button>
      ) : needsApprove ? (
        <button
          onClick={approve}
          disabled={isLoading || quotePending || quoteFailed || insufficientBalance || noValidRows || hasErrors}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-moss-500 hover:bg-moss-600 active:scale-[0.97] active:bg-moss-700 disabled:opacity-50 disabled:cursor-not-allowed text-bone-950 transition-all"
        >
          {step === 'approving' || approveLoading ? 'Approving…' : `Approve ${ASSET_SYMBOL}`}
        </button>
      ) : (
        <button
          onClick={purchase}
          disabled={isLoading || !quotedCost || quotePending || quoteFailed || insufficientBalance || noValidRows || hasErrors || step === 'idle'}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-moss-500 hover:bg-moss-600 active:scale-[0.97] active:bg-moss-700 disabled:opacity-50 disabled:cursor-not-allowed text-bone-950 transition-all"
        >
          {step === 'purchasing' || purchaseLoading
            ? 'Purchasing…'
            : hasErrors
              ? `Fix ${errorRows.length} line${errorRows.length !== 1 ? 's' : ''} to continue`
              : noValidRows
                ? 'Add recipients'
                : `Buy ${formatSeats(totalSeats)} SEAT${totalSeats !== 1n ? 's' : ''} for ${recipients.length}`}
        </button>
      )}
    </div>
  )
}
