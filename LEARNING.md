# Architecture study: buy and refund flows

Reference notes for tracing on-chain interactions from UI input to transaction confirmation.

## Shared foundation: `usePaymentAsset`

`src/hooks/usePaymentAsset.ts` resolves the ERC-20 payment token via `BondingTranche.asset()`, then fetches `symbol` and `decimals`. Cached at the React Query level — all other hooks consume this instead of re-fetching.

## Buy flow (`useBuySeats`)

**State machine steps:** `idle` → `needs-approve` | `ready` → `approving` → `ready` → `purchasing` → `success` | `error`

```
User sets quantity
       │
       ▼
quotePurchase(quantity)          ← useReadContract (dynamic, keepPreviousData)
       │
       ▼
allowance(buyer, bondingTranche) ← useReadContracts (static batch)
balanceOf(buyer)
       │
       ├── allowance < quotedCost ──► needs-approve ──► approve() tx
       │                                      │
       │                                      ▼
       └── allowance >= quotedCost ──► ready ──► purchase() tx
                                              │
                                              ▼
                                    invalidateQueries() → success
```

**Key design choices:**

- Static reads (allowance, balance) are separated from dynamic reads (quote) so changing quantity only refetches the quote.
- `step === 'ready'` guard prevents regressing to `needs-approve` when allowance refetch goes stale after invalidation.
- `recipient` is optional — `undefined` means buy for connected wallet; payment always comes from the buyer.
- No slippage buffer: `maxCost = quotedCost` because tranche pricing is deterministic.

**Contract calls:**

1. `ERC20.approve(bondingTranche, quotedCost)` — if allowance insufficient
2. `BondingTranche.purchase(recipient ?? buyer, quantity, quotedCost)`

## Refund flow (`useRefundSeats`)

**State machine steps:** `idle` → `ready` → `refunding` → `success` | `error`

```
User sets seat count
       │
       ▼
quoteRefund(seats)               ← useReadContract
       │
       ▼
User confirms checkbox
       │
       ▼
refund(seats, recipient)         ← single write, no ERC-20 approve needed
       │
       ▼
invalidateQueries() → success
```

**Solvency gate:** UI reads `totalManagedAssets >= totalSupply * refundPrice` and disables refund when treasury is insolvent.

## Data invalidation

Both flows call `queryClient.invalidateQueries()` on success, refreshing dashboard stats, SEAT balance, tranche progress, and activity status across the app.

## Files to read in order

1. `src/hooks/usePaymentAsset.ts`
2. `src/hooks/useBuySeats.ts`
3. `src/components/seats/BuyForm.tsx`
4. `src/hooks/useRefundSeats.ts`
5. `src/components/seats/RefundForm.tsx`
6. `src/config/contracts.ts` — per-chain address resolution from env
