import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useSeatActivity } from '../../hooks/useSeatActivity'
import { useRefreshAllActivity } from '../../hooks/useRefreshAllActivity'
import { formatSeats, formatUnixDate, formatDuration } from '../../lib/format'

interface Props {
  onGoToBuy?: () => void
}

export function ActivityView({ onGoToBuy }: Props) {
  const { address } = useAccount()
  const a = useSeatActivity()

  if (!address) {
    return (
      <div className="text-center py-10 text-bone-500">
        Connect your wallet to see your SEAT activity.
      </div>
    )
  }

  if (a.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-bone-100 animate-pulse" />
        <div className="h-24 rounded bg-bone-100 animate-pulse" />
      </div>
    )
  }

  if (a.status === 'no-seats') {
    return (
      <div className="text-center py-10">
        <div className="text-base font-semibold text-bone-950 mb-1">You don't hold any SEATs yet</div>
        <div className="text-sm text-bone-500 mb-4">
          Buy SEATs to join the endowment. Your activity tracker starts on mint.
        </div>
        {onGoToBuy && (
          <button
            onClick={onGoToBuy}
            className="inline-block px-4 py-2 rounded-lg bg-moss-500 hover:bg-moss-600 text-bone-950 text-sm font-semibold transition-colors"
          >
            Buy SEATs
          </button>
        )}
      </div>
    )
  }

  if (!a.status) return null

  return (
    <div className="space-y-5">
      <StatusCard a={a} />
      <ReclaimingNote />
      <ActivityExplainer />
      <RefreshAllVotersCard />
    </div>
  )
}

// Permissionless keeper action: refresh onchain activity for every voter of a proposal
// in one transaction. Defaults to the latest proposal, with a manual id override.
function RefreshAllVotersCard() {
  const r = useRefreshAllActivity()
  const [idInput, setIdInput] = useState('')

  // Seed the input with the latest proposal id once it loads (unless the user typed one).
  useEffect(() => {
    if (idInput === '' && r.latestProposalId !== undefined) {
      setIdInput(r.latestProposalId.toString())
    }
  }, [r.latestProposalId])

  const busy = r.step === 'scanning' || r.step === 'refreshing'

  let parsedId: bigint | null = null
  try {
    if (idInput.trim() !== '') {
      const n = BigInt(idInput.trim())
      if (n >= 0n) parsedId = n
    }
  } catch {
    parsedId = null
  }

  const buttonLabel =
    r.step === 'scanning' ? 'Finding voters…'
    : r.step === 'refreshing' ? 'Refreshing…'
    : 'Refresh all voters'

  return (
    <div className="rounded-xl border border-bone-200 bg-bone-50/60 p-5 space-y-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-bone-500">
          Refresh all voters
        </div>
        <div className="text-sm text-bone-800 mt-1">
          Refresh onchain activity for every SEAT holder who voted on a proposal, in a single
          transaction. Anyone can run this — non-voters and non-holders are skipped automatically.
        </div>
      </div>

      <div className="flex items-end gap-3">
        <label className="flex-1">
          <span className="block text-xs text-bone-500 mb-1">Proposal ID</span>
          <input
            type="text"
            inputMode="numeric"
            value={idInput}
            onChange={(e) => { setIdInput(e.target.value); if (r.step !== 'idle') r.reset() }}
            placeholder={r.latestProposalId !== undefined ? r.latestProposalId.toString() : 'latest'}
            disabled={busy}
            className="w-full rounded-lg border border-bone-200 bg-white px-3 py-2 text-sm text-bone-950 tabular-nums focus:outline-none focus:ring-2 focus:ring-moss-400 disabled:opacity-50"
          />
        </label>
        <button
          onClick={() => parsedId !== null && r.refresh(parsedId)}
          disabled={busy || !r.spaceReady || parsedId === null}
          className="px-4 py-2 rounded-lg bg-moss-500 hover:bg-moss-600 text-bone-950 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </div>

      {r.latestProposalId !== undefined && (
        <div className="text-xs text-bone-500">
          Latest proposal: #{r.latestProposalId.toString()}
        </div>
      )}

      {r.step === 'success' && (
        <div className="text-sm font-medium text-brand-600">
          Activity refreshed{r.voterCount !== null ? ` for ${r.voterCount} voter${r.voterCount === 1 ? '' : 's'}` : ''}.
        </div>
      )}

      {r.step === 'error' && r.errorMsg && (
        <div className="text-sm font-medium text-red-600">{r.errorMsg}</div>
      )}
    </div>
  )
}

function StatusCard({ a }: { a: ReturnType<typeof useSeatActivity> }) {
  const { status, balance, lastActivityAt, secondsRemaining } = a

  const tone =
    status === 'reclaimable' ? 'danger' :
    status === 'warning'     ? 'warn'   : 'ok'

  const border =
    tone === 'danger' ? 'border-red-200'
    : tone === 'warn' ? 'border-amber-200'
    :                   'border-bone-200'

  const bg =
    tone === 'danger' ? 'bg-red-50'
    : tone === 'warn' ? 'bg-amber-50'
    :                   'bg-white'

  const statusLabel =
    status === 'reclaimable' ? 'Inactive'
    :                          'Active'

  const statusTone =
    tone === 'danger' ? 'text-red-600'
    : tone === 'warn' ? 'text-amber-600'
    :                   'text-brand-600'

  return (
    <div className={`rounded-xl border ${border} ${bg} p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-bone-500">
              Status
            </span>
            <span className={`text-2xl font-bold ${statusTone}`}>
              {statusLabel}
            </span>
          </div>
          <div className="text-sm font-medium text-bone-800 mt-2">
            {balance !== undefined && `${formatSeats(balance)} SEAT${balance !== 1n ? 's' : ''}`}
          </div>
        </div>
        <div className="text-right">
          {status === 'reclaimable' ? (
            <>
              <div className="text-2xl font-bold text-red-700 tabular-nums">Now</div>
              <div className="text-xs text-bone-500">reclaimable</div>
            </>
          ) : secondsRemaining !== undefined ? (
            <>
              <div className="text-2xl font-bold text-bone-950 tabular-nums">{formatDuration(secondsRemaining)}</div>
              <div className="text-xs text-bone-500">Until inactive</div>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-bone-200">
        <div>
          <div className="text-xs text-bone-500 mb-0.5">Last activity</div>
          <div className="text-sm font-medium text-bone-950">
            {lastActivityAt !== undefined && lastActivityAt > 0n ? formatUnixDate(lastActivityAt) : 'Never recorded'}
          </div>
        </div>
        <div>
          <div className="text-xs text-bone-500 mb-0.5">Reclaimable</div>
          <div className="text-sm font-medium text-bone-950">
            {a.reclaimAt !== undefined && a.reclaimAt > 0n ? formatUnixDate(a.reclaimAt) : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function ReclaimingNote() {
  return (
    <div className="rounded-xl border border-bone-200 bg-bone-50/60 p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-bone-500 mb-1.5">
        Reclaiming
      </div>
      <div className="text-sm text-bone-800">
        If your SEATs are inactive, Shutter PEN can reclaim your SEATs. You will not receive a refund and your SEATs will be burnt.
      </div>
    </div>
  )
}

function ActivityExplainer() {
  return (
    <div className="rounded-xl border border-bone-200 bg-bone-50/60 p-5 space-y-3">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-bone-500">How to stay active</div>
        <div className="text-sm text-bone-800 mt-1">
          Any of actions refreshes your activity timestamp onchain.
        </div>
      </div>

      <ul className="space-y-2 text-sm">
        <li className="flex items-start gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-moss-500 mt-2 flex-shrink-0" />
          <div className="font-medium text-bone-950">Vote on Shutter PEN onchain proposal</div>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-moss-500 mt-2 flex-shrink-0" />
          <div className="font-medium text-bone-950">Buy additional SEATs</div>
        </li>
      </ul>
    </div>
  )
}
