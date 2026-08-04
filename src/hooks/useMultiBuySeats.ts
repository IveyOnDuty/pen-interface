import { useState, useEffect } from 'react'
import { useReadContracts, useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi'
import { useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { getContracts } from '../config/contracts'
import { BondingTrancheAbi } from '../abis/BondingTranche'
import { ERC20Abi } from '../abis/ERC20'
import { usePaymentAsset } from './usePaymentAsset'
import { parseContractError } from './useBuySeats'
import type { BuyStep } from './useBuySeats'

/**
 * Batch-buy controller. The caller (form) owns the raw row inputs and their
 * validation, and passes in the already-validated, non-empty parallel arrays
 * `recipients` / `amounts`. Pricing is a pure function of the supply range the
 * batch crosses, so — exactly like the on-chain `multiPurchase` — the whole
 * batch is quoted once as `quotePurchase(totalSeats)`, independent of how the
 * seats are split across recipients. Payment (approve/allowance/balance) always
 * comes from the connected buyer.
 */
export function useMultiBuySeats(recipients: `0x${string}`[], amounts: bigint[]) {
  const { address } = useAccount()
  const chainId = useChainId()
  const c = getContracts(chainId)
  const { data: asset } = usePaymentAsset()

  const queryClient = useQueryClient()
  const [step, setStep] = useState<BuyStep>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const totalSeats = amounts.reduce((sum, a) => sum + a, 0n)

  // Static reads — balance and allowance don't depend on the batch total.
  const { data: staticReads, refetch: refetchStatic } = useReadContracts({
    contracts: [
      {
        address: asset?.address,
        abi: ERC20Abi,
        functionName: 'allowance',
        args: [address ?? '0x0000000000000000000000000000000000000000', c.bondingTranche],
      },
      {
        address: asset?.address,
        abi: ERC20Abi,
        functionName: 'balanceOf',
        args: [address ?? '0x0000000000000000000000000000000000000000'],
      },
    ],
    query: { enabled: !!address && !!asset?.address },
  })

  // Dynamic read — one aggregate quote over the batch total.
  const {
    data: quotedCost,
    status: quoteStatus,
    isFetching: quoteIsFetching,
  } = useReadContract({
    address: c.bondingTranche,
    abi: BondingTrancheAbi,
    functionName: 'quotePurchase',
    args: [totalSeats],
    query: {
      enabled: totalSeats > 0n,
      placeholderData: keepPreviousData,
      retry: (_, error) => {
        const msg = (error as { message?: string; shortMessage?: string })?.shortMessage
          ?? (error as { message?: string })?.message
          ?? ''
        if (msg.includes('revert') || msg.includes('execution reverted')) return false
        return true
      },
    },
  })

  const allowance = staticReads?.[0]?.result as bigint | undefined
  const balance   = staticReads?.[1]?.result as bigint | undefined
  // Price is fixed per tranche — pay exactly the quoted cost, no slippage buffer.
  const maxCost   = totalSeats > 0n ? quotedCost : undefined
  const quoteFailed   = totalSeats > 0n && quoteStatus === 'error'
  const quotePending  = totalSeats > 0n && (quoteIsFetching || quoteStatus === 'pending')
  const insufficientBalance = balance !== undefined && maxCost !== undefined && balance < maxCost

  useEffect(() => {
    if (!maxCost || allowance === undefined) return
    if (step === 'success' || step === 'approving' || step === 'purchasing') return
    // Once at `ready`, don't regress on a stale allowance refetch.
    if (step === 'ready' && allowance >= maxCost) return
    setStep(allowance >= maxCost ? 'ready' : 'needs-approve')
  }, [maxCost, allowance, step])

  // No rows yet → sit at idle regardless of any stale quote.
  useEffect(() => {
    if (totalSeats === 0n && step !== 'success' && step !== 'purchasing') setStep('idle')
  }, [totalSeats, step])

  const { writeContractAsync: writeApprove, data: approveTxHash } = useWriteContract()
  const { isLoading: approveLoading, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash })

  useEffect(() => {
    if (approveSuccess) { refetchStatic(); setStep('ready') }
  }, [approveSuccess])

  const { writeContractAsync: writePurchase, data: purchaseTxHash } = useWriteContract()
  const { isLoading: purchaseLoading, isSuccess: purchaseSuccess } = useWaitForTransactionReceipt({ hash: purchaseTxHash })

  useEffect(() => {
    if (purchaseSuccess) {
      queryClient.invalidateQueries()
      setStep('success')
    }
  }, [purchaseSuccess])

  async function approve() {
    if (!maxCost || !asset) return
    setErrorMsg(null)
    setStep('approving')
    try {
      await writeApprove({ address: asset.address, abi: ERC20Abi, functionName: 'approve', args: [c.bondingTranche, maxCost] })
    } catch (e: unknown) {
      setErrorMsg(parseContractError(e))
      setStep('needs-approve')
    }
  }

  async function purchase() {
    if (!address || !maxCost || recipients.length === 0) return
    setErrorMsg(null)
    setStep('purchasing')
    try {
      await writePurchase({
        address: c.bondingTranche,
        abi: BondingTrancheAbi,
        functionName: 'multiPurchase',
        args: [recipients, amounts, maxCost],
      })
    } catch (e: unknown) {
      setErrorMsg(parseContractError(e))
      setStep('ready')
    }
  }

  function reset() { setStep('idle'); setErrorMsg(null) }
  function clearError() { setErrorMsg(null) }

  return {
    totalSeats,
    quotedCost: maxCost, balance,
    quoteFailed, quotePending, insufficientBalance,
    asset,
    step,
    approveLoading,
    purchaseLoading,
    errorMsg,
    purchaseTxHash,
    approve, purchase, reset, clearError,
  }
}
