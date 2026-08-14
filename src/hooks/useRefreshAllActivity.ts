import { useEffect, useState } from 'react'
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { parseAbiItem } from 'viem'
import { getContracts } from '../config/contracts'
import { SeatTokenAbi } from '../abis/SeatToken'
import { SpaceAbi } from '../abis/Space'

const ZERO = '0x0000000000000000000000000000000000000000' as const

const VOTE_CAST_EVENT = parseAbiItem(
  'event VoteCast(uint256 proposalId, address voter, uint8 choice, uint256 votingPower)',
)

// eth_getLogs paging tuned for public RPCs, which vary widely: some cap the block
// range (2k–10k blocks), some cap the number of results, some rate-limit hard.
// We start with a conservative span and shrink adaptively when a window is rejected.
const INITIAL_LOG_SPAN = 5_000n   // starting block span per request
const MIN_LOG_SPAN = 100n         // don't shrink below this before giving up
const MAX_LOG_REQUESTS = 400      // safety cap so a huge window can't loop forever
const RATE_LIMIT_RETRIES = 4      // transient 429 / throttle retries per request

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Flatten the messages viem nests across the error and its cause chain.
function errText(e: unknown): string {
  const err = e as { message?: string; details?: string; shortMessage?: string; cause?: { message?: string; details?: string } }
  return `${err?.shortMessage ?? ''} ${err?.message ?? ''} ${err?.details ?? ''} ${err?.cause?.message ?? ''} ${err?.cause?.details ?? ''}`.toLowerCase()
}

// True when the RPC rejected the request because the block range or result set was
// too large — the signal to shrink the window and retry. Covers the common codes
// (-32602 invalid params, -32005 limit exceeded) and provider message variants,
// including drpc's "ranges over 10000 blocks are not supported".
function isRangeLimitError(e: unknown): boolean {
  const err = e as { code?: number; cause?: { code?: number } }
  const code = err?.code ?? err?.cause?.code
  const msg = errText(e)
  return (
    code === -32602 || code === -32005 ||
    /block range|range is too|ranges? over \d+|blocks are not supported|not supported on free|too large|too many results|more than \d+ results|query returned more|limit exceeded|response size|exceeds? (the )?limit|max(imum)? .*results/.test(msg)
  )
}

// Transient throttling that should be retried as-is after a short backoff. Some
// public RPCs (drpc) surface this as a normal RPC error, not an HTTP 429.
function isRateLimitError(e: unknown): boolean {
  const err = e as { code?: number; status?: number; cause?: { status?: number } }
  const status = err?.status ?? err?.cause?.status
  return status === 429 || err?.code === 429 || /rate limit|too many requests|upgrade to paid|429/.test(errText(e))
}

// A hard capability gap that shrinking/retrying cannot fix — return an actionable
// message so the UI can tell the operator to point at a real RPC, rather than
// surfacing a cryptic "-32602 Invalid params".
function rpcCapabilityMessage(e: unknown): string | null {
  const msg = errText(e)
  if (/archive/.test(msg))
    return 'This RPC only serves recent blocks (no archive). Configure an archive-capable RPC via VITE_RPC_*.'
  if (/rate limit|too many requests|upgrade to paid/.test(msg))
    return 'This RPC rate-limits log queries. Configure a dedicated RPC via VITE_RPC_*.'
  return null
}

export type RefreshAllStep = 'idle' | 'scanning' | 'refreshing' | 'success' | 'error'

// Refreshes onchain activity for EVERY voter of a given proposal in a single transaction.
// Discovery is fully client-side: read the Space from the SeatToken, find the latest proposal,
// collect its voters from VoteCast logs, then call refreshActivityForProposalVoters.
export function useRefreshAllActivity() {
  const { address } = useAccount()
  const chainId = useChainId()
  const c = getContracts(chainId)
  const publicClient = usePublicClient()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<RefreshAllStep>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [voterCount, setVoterCount] = useState<number | null>(null)

  // The Space address is stored on the SeatToken (set once via setSpace).
  const { data: spaceAddr } = useReadContract({
    address: c.seatToken,
    abi: SeatTokenAbi,
    functionName: 'space',
    query: { enabled: !!c.seatToken },
  })

  // latest proposal id = nextProposalId - 1
  const { data: nextProposalId } = useReadContract({
    address: spaceAddr,
    abi: SpaceAbi,
    functionName: 'nextProposalId',
    query: { enabled: !!spaceAddr && spaceAddr !== ZERO },
  })

  const latestProposalId =
    nextProposalId !== undefined && (nextProposalId as bigint) > 0n
      ? (nextProposalId as bigint) - 1n
      : undefined

  const { writeContractAsync, data: txHash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries()
      setStep('success')
    }
  }, [isSuccess])

  // Collect the unique voter addresses for `proposalId` by scanning VoteCast logs,
  // bounded to the proposal's voting window so the query stays small.
  async function collectVoters(proposalId: bigint): Promise<`0x${string}`[]> {
    if (!publicClient || !spaceAddr) throw new Error('Not ready')

    const proposal = (await publicClient.readContract({
      address: spaceAddr,
      abi: SpaceAbi,
      functionName: 'proposals',
      args: [proposalId],
    })) as readonly [
      `0x${string}`, number, `0x${string}`, number, number, number, `0x${string}`, bigint,
    ]

    const startBlock = BigInt(proposal[1])       // startBlockNumber
    const maxEndBlock = BigInt(proposal[4])       // maxEndBlockNumber

    if (startBlock === 0n) throw new Error(`Proposal #${proposalId} does not exist`)

    // maxEndBlockNumber may be in the future while voting is still open — clamp to head.
    const head = await publicClient.getBlockNumber()
    const toBlock = maxEndBlock < head ? maxEndBlock : head

    // Fetch a single block window, retrying transient rate-limits with backoff.
    // Range/result-size rejections are re-thrown so the caller can shrink the span.
    const getWindow = async (from: bigint, to: bigint) => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await publicClient.getLogs({ address: spaceAddr, event: VOTE_CAST_EVENT, fromBlock: from, toBlock: to })
        } catch (e) {
          if (isRateLimitError(e) && attempt < RATE_LIMIT_RETRIES) {
            await sleep(Math.min(2_000, 300 * 2 ** attempt))
            continue
          }
          throw e
        }
      }
    }

    // Page the scan across the voting window. Public RPCs cap the range and/or result
    // count, so we adapt: shrink the span when a window is rejected, and keep the
    // working span once one succeeds.
    const voters = new Set<`0x${string}`>()
    let span = INITIAL_LOG_SPAN
    let cursor = startBlock
    let requests = 0

    while (cursor <= toBlock) {
      if (++requests > MAX_LOG_REQUESTS) {
        throw new Error('Voting window is too large to scan on this RPC — configure a custom RPC endpoint (VITE_RPC_*).')
      }

      const end = cursor + span - 1n
      const chunkTo = end < toBlock ? end : toBlock

      try {
        const logs = await getWindow(cursor, chunkTo)
        for (const log of logs) {
          const a = log.args
          if (a.proposalId === proposalId && a.voter) voters.add(a.voter)
        }
        cursor = chunkTo + 1n
      } catch (e) {
        // Archive/rate-limit gaps can't be paged around — fail fast with guidance.
        const capMsg = rpcCapabilityMessage(e)
        if (capMsg) throw new Error(capMsg)
        if (isRangeLimitError(e) && span > MIN_LOG_SPAN) {
          span = span / 2n > MIN_LOG_SPAN ? span / 2n : MIN_LOG_SPAN
          continue // retry the same cursor with a smaller window
        }
        throw e
      }
    }
    return [...voters]
  }

  async function refresh(proposalId: bigint) {
    if (!address || !spaceAddr) return
    setErrorMsg(null)
    setVoterCount(null)
    setStep('scanning')
    try {
      const voters = await collectVoters(proposalId)
      setVoterCount(voters.length)
      if (voters.length === 0) {
        setErrorMsg(`No votes found for proposal #${proposalId}.`)
        setStep('error')
        return
      }
      setStep('refreshing')
      await writeContractAsync({
        address: c.seatToken,
        abi: SeatTokenAbi,
        functionName: 'refreshActivityForProposalVoters',
        args: [proposalId, voters],
      })
      // success is set by the receipt effect
    } catch (e: unknown) {
      const msg =
        (e as { shortMessage?: string })?.shortMessage ??
        (e as { message?: string })?.message ??
        ''
      setErrorMsg(msg.includes('User rejected') ? 'Transaction rejected.' : msg.slice(0, 140) || 'Refresh failed.')
      setStep('error')
    }
  }

  function reset() {
    setStep('idle')
    setErrorMsg(null)
    setVoterCount(null)
  }

  return {
    latestProposalId,
    spaceReady: !!spaceAddr && spaceAddr !== ZERO,
    step,
    errorMsg,
    voterCount,
    txHash,
    refresh,
    reset,
  }
}
