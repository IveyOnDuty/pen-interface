import { useState } from 'react'
import { useChainId } from 'wagmi'
import { getContracts, isSupportedChain } from '../config/contracts'
import { getExplorerUrl } from '../config/constants'

// External resources.
const RESOURCES: { label: string; href: string; note?: string }[] = [
  { label: 'Forum',  href: 'https://holders.vote/h/shutterpen.eth' },
  { label: 'Voting', href: 'https://snapshot.box/#/s/shutterpen.eth' },
]

function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <button
      onClick={copy}
      className="text-xs font-medium text-bone-500 hover:text-brand-600 transition-colors"
      aria-label="Copy address"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function AddressRow({
  label,
  address,
  explorerUrl,
}: {
  label: string
  address?: `0x${string}`
  explorerUrl: string
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 bg-bone-50 hover:bg-bone-100/60 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-bone-950">{label}</div>
        {address ? (
          <div className="font-mono text-xs text-bone-500 mt-0.5 truncate">{address}</div>
        ) : (
          <div className="text-xs text-bone-400 mt-0.5">Not configured</div>
        )}
      </div>
      {address && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <CopyButton value={address} />
          {explorerUrl && (
            <a
              href={`${explorerUrl}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {shortAddress(address)} ↗
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function Links() {
  const chainId = useChainId()
  const explorerUrl = getExplorerUrl(chainId)
  const contracts = isSupportedChain(chainId) ? getContracts(chainId) : undefined

  const addresses: { label: string; address?: `0x${string}` }[] = [
    { label: 'Safe',              address: contracts?.safe },
    { label: 'SEAT Token',        address: contracts?.seatToken },
    { label: 'Principal Manager', address: contracts?.principalManager },
    { label: 'Bonding Tranche',   address: contracts?.bondingTranche },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-bone-950">Links</h1>
        <p className="text-sm text-bone-500 mt-0.5">
          Key Shutter PEN resources and on-chain addresses
        </p>
      </div>

      {/* Resources */}
      <section>
        <div className="text-xs font-semibold text-bone-500 uppercase tracking-wider mb-3">Resources</div>
        <div className="rounded-xl border border-bone-200 overflow-hidden divide-y divide-bone-200">
          {RESOURCES.map(({ label, href, note }) => {
            const disabled = href === '#'
            return (
              <a
                key={label}
                href={href}
                target={disabled ? undefined : '_blank'}
                rel="noopener noreferrer"
                onClick={disabled ? (e) => e.preventDefault() : undefined}
                aria-disabled={disabled}
                className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${
                  disabled
                    ? 'bg-bone-50 cursor-default'
                    : 'bg-bone-50 hover:bg-bone-100/60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-bone-950">{label}</div>
                </div>
                {note ? (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-bone-100 text-bone-500 flex-shrink-0">
                    {note}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-brand-600 flex-shrink-0">Open ↗</span>
                )}
              </a>
            )
          })}
        </div>
      </section>

      {/* Addresses */}
      <section>
        <div className="text-xs font-semibold text-bone-500 uppercase tracking-wider mb-3">Addresses</div>
        <div className="rounded-xl border border-bone-200 overflow-hidden divide-y divide-bone-200">
          {addresses.map(({ label, address }) => (
            <AddressRow key={label} label={label} address={address} explorerUrl={explorerUrl} />
          ))}
        </div>
      </section>
    </div>
  )
}
