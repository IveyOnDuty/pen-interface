import { useState, useEffect } from 'react'
import { isAddress } from 'viem'
import { useAccount, useChainId } from 'wagmi'
import { useBuySeats } from '../../hooks/useBuySeats'
import { useDashboard } from '../../hooks/useDashboard'
import { useTranches } from '../../hooks/useTranches'
import { formatAsset, formatSeats } from '../../lib/format'
import { splitAcrossTranches } from '../../lib/tranches'
import { getExplorerUrl } from '../../config/constants'
import { MultiBuyForm } from './MultiBuyForm'

type BuyMode = 'single' | 'batch'

// Wraps the buy panel with a Single / Batch toggle. Each mode's form is its own
// component so its hooks (quotes, allowance reads) only run while it's mounted.
export function BuyForm() {
  const [mode, setMode] = useState<BuyMode>('single')

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-bone-100 rounded-lg">
        {(['single', 'batch'] as BuyMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors ${
              mode === m ? 'bg-bone-50 text-bone-950 shadow-sm' : 'text-bone-500 hover:text-bone-700'
            }`}
          >
            {m === 'single' ? 'Single' : 'Batch'}
          </button>
        ))}
      </div>

      {mode === 'single' ? <SingleBuyForm /> : <MultiBuyForm />}
    </div>
  )
}

function SingleBuyForm() {
  const { address } = useAccount()
  const chainId = useChainId()
  const explorerUrl = getExplorerUrl(chainId)
  const {
    quantity, setQuantity,
    recipient, setRecipient,
    quotedCost, balance,
    quoteFailed, quotePending, insufficientBalance,
    asset,
    step, approveLoading, purchaseLoading,
    purchaseTxHash,
    errorMsg, approve, purchase, reset, clearError,
  } = useBuySeats()

  const d = useDashboard()
  const { tranches } = useTranches(d.trancheCount)

  const ASSET_SYMBOL = asset?.symbol ?? '…'
  const ASSET_DECIMALS = asset?.decimals ?? 6

  const [inputStr, setInputStr] = useState(quantity.toString())
  // Keep display in sync when the hook resets (e.g. after success)
  useEffect(() => { setInputStr(quantity.toString()) }, [quantity])

  // Optional recipient — buy SEATs on someone else's behalf.
  const [forOther, setForOther] = useState(false)
  const [recipientStr, setRecipientStr] = useState('')
  // Keep the form field in sync when the hook resets after a purchase.
  useEffect(() => { if (recipient === undefined) { setForOther(false); setRecipientStr('') } }, [recipient])

  const recipientValid = isAddress(recipientStr.trim())
  const recipientEmpty = recipientStr.trim().length === 0
  const recipientInvalid = forOther && !recipientEmpty && !recipientValid
  // Block buying-for-other until a valid address is entered.
  const recipientBlocked = forOther && !recipientValid

  // Push a validated recipient into the hook (or clear it) so `purchase` mints
  // to the right address. Only valid addresses reach the hook.
  useEffect(() => {
    setRecipient(forOther && recipientValid ? (recipientStr.trim() as `0x${string}`) : undefined)
  }, [forOther, recipientValid, recipientStr, setRecipient])

  const isLoading = approveLoading || purchaseLoading

  const segments =
    d.totalSupply !== undefined && tranches.length > 0
      ? splitAcrossTranches(quantity, d.totalSupply, tranches)
      : []

  if (step === 'success') {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-3">✓</div>
        <div className="text-lg font-semibold text-bone-950 mb-1">Purchase complete</div>
        <div className="text-sm text-bone-500 mb-4">
          {recipient
            ? <>{formatSeats(quantity)} SEAT{quantity !== 1n ? 's' : ''} sent to <span className="font-mono text-bone-700">{recipient.slice(0, 6)}…{recipient.slice(-4)}</span>.</>
            : <>{formatSeats(quantity)} SEAT{quantity !== 1n ? 's' : ''} added to your wallet.</>}
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
          <button onClick={reset} className="text-brand-600 hover:text-brand-700 text-sm font-medium">
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

      {/* Quantity input */}
      <div>
        <label className="block text-sm font-medium text-bone-700 mb-1.5">
          Number of SEATs
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={inputStr}
          onChange={e => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            setInputStr(raw)
            const v = parseInt(raw, 10)
            if (!isNaN(v) && v > 0) setQuantity(BigInt(v))
          }}
          onBlur={() => {
            const v = parseInt(inputStr, 10)
            if (isNaN(v) || v < 1) setInputStr(quantity.toString())
          }}
          className="w-full text-center text-xl font-bold rounded-lg border border-bone-300 bg-bone-50 text-bone-950 py-2.5 focus:outline-none focus:ring-2 focus:ring-moss-500 tabular-nums"
        />
      </div>

      {/* Recipient — buy on someone else's behalf */}
      <div>
        <label className="flex items-center gap-2 text-sm text-bone-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={forOther}
            onChange={e => setForOther(e.target.checked)}
            className="h-4 w-4 rounded border-bone-300 text-moss-500 focus:ring-moss-500"
          />
          Buy for someone else
        </label>
        {forOther && (
          <div className="mt-2">
            <input
              type="text"
              spellCheck={false}
              autoComplete="off"
              value={recipientStr}
              onChange={e => setRecipientStr(e.target.value)}
              placeholder="Recipient address (0x…)"
              className={`w-full text-sm font-mono rounded-lg border bg-bone-50 text-bone-950 px-3 py-2.5 focus:outline-none focus:ring-2 ${
                recipientInvalid
                  ? 'border-red-300 focus:ring-red-400'
                  : 'border-bone-300 focus:ring-moss-500'
              }`}
            />
            {recipientInvalid && (
              <div className="mt-1 text-xs text-red-600">Enter a valid Ethereum address.</div>
            )}
            {recipientValid && (
              <div className="mt-1 text-xs text-bone-500">SEATs will be minted to this address. You pay from your wallet.</div>
            )}
          </div>
        )}
      </div>

      {/* Quote failed — not enough seats available */}
      {quoteFailed && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-700">
          Not enough SEATs available. Reduce quantity.
        </div>
      )}

      {/* Per-tranche breakdown */}
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

      {/* Cost total */}
      {quotedCost !== undefined && (
        <div className="rounded-xl bg-bone-50 border border-bone-200 p-4">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-bone-700">You pay</span>
            <span className="text-bone-950 tabular-nums">{formatAsset(quotedCost, ASSET_DECIMALS, ASSET_SYMBOL)}</span>
          </div>
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
          disabled={isLoading || quotePending || quoteFailed || insufficientBalance || recipientBlocked}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-moss-500 hover:bg-moss-600 active:scale-[0.97] active:bg-moss-700 disabled:opacity-50 disabled:cursor-not-allowed text-bone-950 transition-all"
        >
          {step === 'approving' || approveLoading ? 'Approving…' : `Approve ${ASSET_SYMBOL}`}
        </button>
      ) : (
        <button
          onClick={purchase}
          disabled={isLoading || !quotedCost || quotePending || quoteFailed || insufficientBalance || step === 'idle' || recipientBlocked}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-moss-500 hover:bg-moss-600 active:scale-[0.97] active:bg-moss-700 disabled:opacity-50 disabled:cursor-not-allowed text-bone-950 transition-all"
        >
          {step === 'purchasing' || purchaseLoading
            ? 'Purchasing…'
            : `Buy ${formatSeats(quantity)} SEAT${quantity !== 1n ? 's' : ''}${forOther && recipientValid ? ' for them' : ''}`}
        </button>
      )}
    </div>
  )
}
