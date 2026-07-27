# PEN Frontend

Frontend for the **Perpetual Endowment Network (PEN)** — a SEAT-based treasury protocol on Ethereum. Members buy SEATs to join the endowment; the protocol invests the principal, distributes yield to grantees, and lets holders refund SEATs at a fixed price. Inactive holders can be reclaimed by the protocol.

Built with React 19, Vite, wagmi v2, RainbowKit, and TanStack Query. Styled with Tailwind CSS in Shutter's brand palette (Shutter blue `#0044a4` and Shutter yellow `#fde12d`).

---

## Roadmap

Rollout phases for taking the frontend from local dev to a live deployment. Each phase links to the relevant section below.


| Phase                         | Goal                                            | Status                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Local dev**              | Run the app against Sepolia contracts           | **Done** — `.env` configured, dev server on Sepolia. See [How to Run](#how-to-run).                                                                                                    |
| **2. Flow validation**        | Confirm every user-facing path works on Sepolia | **Done** on Sepolia; mainnet smoke-test after Phase 6 deploy. See [Phase 2 checklist](#phase-2-flow-validation) below. |
| **3. Production build**       | Verify the static bundle before pinning         | **Done** — `npm run build` passes. See [Production build](#production-build). |
| **4. Sepolia staging (IPFS)** | Deploy a testnet build users can reach          | **Done** — Sepolia build pinned and smoke-tested. See [Deploying to IPFS](#deploying-to-ipfs). |
| **5. Stable URL**             | Stop handing out raw CIDs                       | **Done** — `shutterpen.eth` contenthash → IPFS. Update on each release. See [Give it a stable URL](#give-it-a-stable-url). |
| **6. Mainnet production**     | Go live with real assets                        | **Done** — mainnet on `shutterpen.eth`; use Alchemy in `.env.production.local` for RPC. Rebuild + re-pin when RPC changes. |




### Phase 2 — Flow validation

**Automated (no wallet):**

```bash
npm run validate:reads   # hits every on-chain read path the UI uses
```

**Manual (wallet on Sepolia, app at** `http://localhost:5173`**):**


| Screen               | What to verify                                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Metrics**          | SEAT stats, tranche bar/table, treasury figures load; Recent Disbursements shows events or an empty state (not a stuck spinner). |
| **SEATs → Buy**      | Quantity quote + tranche breakdown appear; approve → purchase completes if you hold the payment token.                           |
| **SEATs → Refund**   | Quote loads; checkbox + refund tx succeeds if you hold SEATs and treasury is solvent.                                            |
| **SEATs → Activity** | Status, inactivity timer, and stay-active guidance render for your address.                                                      |
| **Links**            | Contract addresses match `.env`; external links open.                                                                            |


Restart the dev server after changing `.env`. Use an Alchemy/Infura Sepolia RPC for reliable disbursement logs (public RPCs may work with chunked fallback).

**One CID per environment** — staging (Sepolia) and production (mainnet) need separate builds because all `VITE_`* values are baked in at build time. Production builds use `.env.production` (mainnet-only); `npm run dev` uses `.env` with both chains when Sepolia vars are set.

**Before Phase 4**, complete the [Gotchas specific to this app](#gotchas-specific-to-this-app): WalletConnect domain allowlist, rate-limited RPC keys, and a full click-through on a real IPFS gateway (not just `npx serve dist`).

---



## How to Run



### Prerequisites

- **Node.js 20+** and **npm** (or `pnpm` / `yarn` — the lockfile is npm).
- A wallet: MetaMask or any WalletConnect-compatible wallet.
- An RPC endpoint with high log limits (Alchemy or Infura). Public RPCs cap `eth_getLogs` block ranges too tightly for the disbursements query to succeed reliably.



### Install

```bash
npm install
```



### Configure

Copy the example env file and fill in your keys and addresses:

```bash
cp .env.example .env
```

At minimum you need the three Sepolia contract addresses (defaults are already filled in) and one RPC URL. See [Environment Variables](#environment-variables) below.

### Development

```bash
npm run dev            # starts Vite dev server (default: http://localhost:5173)
```

The dev server hot-reloads on file changes. Note: changes to `tailwind.config.js` (e.g. adding new color scales) sometimes require a manual restart because Tailwind's plugin reads the config at PostCSS init.

### Production build

```bash
npm run build          # tsc -b && vite build → outputs to dist/
npm run preview        # serve the dist/ build locally to sanity-check
```



### Lint

```bash
npm run lint           # oxlint (fast, no config needed)
```

---



## Deploying to IPFS

The frontend is a fully static bundle after `npm run build`, so it can be hosted on IPFS without any backend. The build is already configured for it.

### Build

```bash
npm run build
npx serve dist         # sanity-check the bundle locally before pinning
```

Every path in `dist/index.html` should be relative (`./assets/...`). If you add a `<link>` or `<img>` with an absolute path (`/foo.png`), it will 404 on IPFS gateways.

### Pin the bundle

Pick one:


| Service                     | Notes                                                                                                                                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4EVERLAND**               | Connect the GitHub repo, build command `npm run build`, publish dir `dist`. Auto-pins on every push, supports IPFS + Arweave, ENS `contenthash`, and custom domains. Closest to a turn-key Git → IPFS flow. |
| **web3.storage / Storacha** | `npx @web3-storage/w3cli login` (once) → `npx @web3-storage/w3cli space create <name>` → `npm run deploy:ipfs`. Prefer `@storacha/cli` when global install works; on Windows use `npx` if native deps fail. Returns a CID / `*.storacha.link` URL. |
| **Filebase**                | S3-compatible IPFS pinning with a dashboard and API.                                                                                                                                                        |
| **Pinata**                  | Drag `dist/` into the dashboard or use their API.                                                                                                                                                           |
| **Local** `ipfs` **daemon** | `ipfs add -r dist && ipfs pin add <CID>`. Fine for testing; not durable unless the node stays up.                                                                                                           |




### Give it a stable URL

The CID changes on every deploy. To avoid handing out fresh CIDs each release, point a name at it:

- **ENS + IPFS** (Web3-native): set the `contenthash` record on `yourname.eth` to the CID. Users load it via `yourname.eth.limo`, `yourname.eth.link`, Brave, or MetaMask. Update the contenthash per deploy (small gas cost; free-ish on L2 resolvers).
- **DNSLink**: add a TXT record `_dnslink.yourdomain.com` → `dnslink=/ipfs/<CID>`. Users hit `yourdomain.com` via any gateway.



### Gotchas specific to this app

- **WalletConnect**: `VITE_WALLETCONNECT_PROJECT_ID` must be a project whose allowlist in the WalletConnect Cloud dashboard includes every domain you'll serve from: `*.eth.limo`, `*.eth.link`, `*.ipfs.dweb.link`, `*.ipfs.w3s.link`, your ENS name, and any DNSLink or custom domain. Otherwise the modal errors out on the deployed site.
- **RPC endpoints**: `VITE_RPC_SEPOLIA` / `VITE_RPC_MAINNET` ship in the bundle and are publicly readable. Use rate-keyed Alchemy/Infura URLs, not a private key or unmetered endpoint. For production builds, put the mainnet RPC in **`.env.production.local`** (gitignored) so the API key is not committed.
- **Env vars are baked at build time**: to change any `VITE_`* value you must rebuild and re-pin. Plan on one CID per environment (staging vs. production).
- **Test on a real gateway**: `npx serve dist` misses gateway-specific quirks (CSP, subdomain vs. path routing). After pinning, load your CID via `https://<cid>.ipfs.dweb.link` and click through every route before updating ENS.

---



## Environment Variables


| Variable                                      | Required    | Description                                                                         |
| --------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `VITE_WALLETCONNECT_PROJECT_ID`               | Optional    | WalletConnect Cloud project id — enables WalletConnect connectors                   |
| `VITE_RPC_SEPOLIA`                            | Recommended | Alchemy/Infura Sepolia RPC — needed for disbursement log queries                    |
| `VITE_RPC_MAINNET`                            | Recommended | Alchemy/Infura Mainnet RPC                                                          |
| `VITE_SEPOLIA_SEAT_TOKEN`                     | Yes         | SeatToken contract address on Sepolia                                               |
| `VITE_SEPOLIA_BONDING_TRANCHE`                | Yes         | BondingTranche address on Sepolia                                                   |
| `VITE_SEPOLIA_PRINCIPAL_MANAGER`              | Yes         | PrincipalManager address on Sepolia                                                 |
| `VITE_SEPOLIA_PRINCIPAL_MANAGER_DEPLOY_BLOCK` | Recommended | Start block for log queries — avoids scanning from genesis                          |
| `VITE_SEPOLIA_EXPLORER_URL`                   | Optional    | Block explorer base URL for transaction links (e.g. `https://sepolia.etherscan.io`) |
| `VITE_MAINNET_*`                              | Production  | Mainnet contract set — see `.env.example`; `npm run build` loads `.env.production` |


The payment asset (address, symbol, decimals) is discovered on-chain via `BondingTranche.asset()` at runtime — it is not an env var.

`getSupportedChains()` in `src/config/contracts.ts` determines which chains the RainbowKit modal offers, based on which `VITE_*_SEAT_TOKEN` addresses are set.

---



## Smart Contract Architecture

The protocol is composed of three contracts. Their addresses are configured per chain in `.env`.

### SeatToken

ERC-20 with 0 decimals — each unit represents one indivisible SEAT. Wallet balance = number of SEATs owned. Tracks per-holder activity for the reclaim mechanism.

Key reads: `balanceOf(address)`, `totalSupply()`, `supplyCap()`, `lastActivityAt(address)`, `inactivityPeriod()`, `isInactive(address)`.

### BondingTranche

Controls SEAT pricing through a tranche system. Each tranche defines an upper SEAT count bound and a fixed price per SEAT. As total supply crosses tranche boundaries, the price steps up. Because pricing is deterministic per tranche, purchases pay the exact `quotePurchase` amount — no slippage buffer is used in the UI.

Key reads:

- `asset()` — the ERC-20 payment token (e.g. USDC)
- `currentSeatPrice()` — price in the active tranche
- `refundPrice()` — fixed protocol-set refund price
- `quotePurchase(quantity)` — exact cost for N SEATs at current pricing
- `quoteRefund(seats)` — exact payout for burning N SEATs
- `trancheCount()`, `tranche(i)` — tranche bounds and prices
- `purchase(recipient, quantity, maxCost)` — buy SEATs
- `refund(seats, recipient)` — burn SEATs and receive payment



### PrincipalManager

Treasury vault that manages the collected principal. Tracks liquid assets (in-contract) and deployed assets (in an ERC-4626 vault). Computes available yield above the principal obligation and disburses it to recipients via `executeFunding(recipients, amounts)`.

Key reads: `totalManagedAssets()`, `accountedPrincipal()`, `availableYield()`, `liquidAssets()`, `deployedAssets()`.

Key event: `FundingExecuted(address[] recipients, uint256[] amounts)` — emitted on every disbursement round.

---



## Key User Flows



### Buy SEATs

1. User sets quantity → `quotePurchase(quantity)` returns the exact cost.
2. The UI shows a per-tranche breakdown: how many SEATs at what price, split across tranches if the purchase crosses a boundary.
3. If `allowance(user, bondingTranche) < quotedCost`: prompt **Approve** first.
4. After approval (or if already approved): call `purchase(userAddress, quantity, quotedCost)`.
5. On receipt confirmation: invalidate all queries (wallet balance, SEAT count, supply, tranche progress).

The two-step state machine (`needs-approve → approving → ready → purchasing → success`) guards against step regression on refetch — for example, `allowance` going stale after `queryClient.invalidateQueries()` cannot overwrite a terminal state.

### Refund SEATs

1. User sets SEAT count → `quoteRefund(seats)` returns the payout amount.
2. Banner reminds the user that the refund price is fixed regardless of purchase price.
3. Checkbox confirms intent (refund burns SEATs permanently).
4. Single call: `refund(seats, userAddress)` — no ERC-20 approval needed. The contract uses a privileged role to `seatToken.burn(msg.sender, seats)`, then transfers payment to the recipient.
5. On receipt: invalidate all queries.

Solvency check: the UI reads `totalManagedAssets() >= totalSupply() * refundPrice()` and disables the refund button when the treasury is insolvent.

### SEAT Activity / Reclaim

Each holder has an on-chain `lastActivityAt` timestamp. If they don't act within `inactivityPeriod`, they become reclaimable — the protocol can burn their SEATs without refund.

The **SEATs → Activity** tab shows:

- **Status**: `Active` (blue) or `Inactive` (red).
- Time **until inactive** (or "Now" once eligible).
- Last activity date and reclaim-eligible date.
- A `Reclaiming` note explaining the mechanism.
- **How to stay active**: vote on a Shutter PEN onchain proposal, or buy additional SEATs — both refresh the activity timestamp on-chain.



### Dashboard

- **SEATs**: `SEATs Active`, `Supply Cap`, `Buy Price` (highlighted), `Refund Price` — single multicall, 30s auto-refresh.
- **Tranches**: segmented bar of tranche progress + a per-tranche table (SEAT count and price per SEAT). Rendered from `BondingTranche.tranche(i)` reads.
- **Treasury**: `totalManagedAssets`, `accountedPrincipal`, `availableYield`, `liquidAssets`, `deployedAssets`.
- **Recent Disbursements**: `eth_getLogs` from `PRINCIPAL_MANAGER_DEPLOY_BLOCK` for `FundingExecuted` events. Block timestamps are fetched for the 5 most recent events. Falls back to 5k-block chunks when the RPC caps the log range.

---



## Frontend Architecture

```
src/
├── main.tsx                 # Provider stack: wagmi → QueryClient → RainbowKit → Router
├── App.tsx                  # Routes: / → Dashboard, /seats → Seats, /activity → /seats
│
├── config/
│   ├── wagmi.ts             # getDefaultConfig (RainbowKit) + connector patching
│   ├── contracts.ts         # Per-chain address resolution from env vars
│   └── constants.ts         # Explorer URLs and deploy blocks (per-chain)
│
├── hooks/
│   ├── usePaymentAsset.ts   # Fetches asset address → symbol + decimals (shared/cached)
│   ├── useDashboard.ts      # 10-read multicall for overview stats
│   ├── useTranches.ts       # Reads all tranche bounds and prices
│   ├── useDisbursements.ts  # eth_getLogs + block timestamps for FundingExecuted events
│   ├── useSeatActivity.ts   # Balance + lastActivityAt + inactivityPeriod + isInactive
│   ├── useBuySeats.ts       # Buy state machine (quote → approve → purchase)
│   └── useRefundSeats.ts    # Refund state machine (quote → refund)
│
├── components/
│   ├── layout/
│   │   ├── Layout.tsx       # Shell: Sidebar + TopBar + Outlet, plus WrongNetwork gate
│   │   ├── Sidebar.tsx      # Shutter-branded blue header strip + white nav
│   │   ├── TopBar.tsx       # Shutter blue header with shadow + wallet buttons
│   │   └── WalletButtons.tsx # RainbowKit custom render
│   ├── dashboard/
│   │   ├── StatCard.tsx     # Reusable metric card with loading skeleton
│   │   └── TrancheProgress.tsx  # Tranche bar + per-tranche table
│   └── seats/
│       ├── ActivityView.tsx # SEAT activity/reclaim status view
│       ├── BuyForm.tsx      # Approve + Buy UI driven by useBuySeats
│       └── RefundForm.tsx   # Refund UI driven by useRefundSeats
│
├── pages/
│   ├── Dashboard.tsx        # Overview page (stats + tranches + treasury + disbursements)
│   └── Seats.tsx            # Activity / Buy / Refund tabs
│
├── abis/                    # TypeScript ABI definitions for all three contracts + ERC-20
└── lib/
    └── format.ts            # formatAsset, formatAssetCompact, formatSeats, formatUnixDate, formatDuration
```



### Provider Stack

```
WagmiProvider (wagmiConfig)
  └── QueryClientProvider (TanStack Query)
        └── RainbowKitProvider
              └── HashRouter
                    └── App
```



### Data Fetching Pattern

`usePaymentAsset` is the shared foundation — it resolves the payment token address, symbol, and decimals in two chained RPC calls and is cached at the React Query level. All other hooks consume it rather than re-fetching independently.

Static and dynamic reads are kept in separate `useReadContracts` / `useReadContract` calls so that changing the user's input (quantity, SEAT count) only triggers a refetch of the quote — not the entire read batch. `keepPreviousData` on quote calls prevents the cost breakdown from disappearing while the new quote loads.

Every displayed data point is fetched from chain — nothing is mocked or hardcoded. See `useDashboard`, `useTranches`, `useDisbursements`, `useSeatActivity`, `useBuySeats`, `useRefundSeats`.

### Wallet Persistence Fix

wagmi v2 persists wallet connections to localStorage but strips connectors down to `{id, name, type, uid}`, removing all methods. On the next page load, wagmi's `getConnectorClient` calls `connector.getChainId()` unconditionally and throws before any write transaction can proceed.

`src/config/wagmi.ts` subscribes to the wagmi store and patches missing methods (`getChainId`, `getProvider`, `disconnect`, `emitter`) onto every connector as it appears in the connections map, ensuring transactions work immediately on page reload without waiting for a full reconnect cycle.

---



## Design

Single light-mode theme matching Shutter's brand:

- **Body**: white
- **Header + sidebar brand strip**: Shutter blue `#0044a4` (`bg-brand-600`), white wordmark, drop shadow beneath
- **Sidebar nav (below the strip)**: white with subtle right border, active item tinted blue
- **Buttons**: Shutter yellow `#fde12d` (`bg-moss-500`) with dark text; destructive actions in red
- **Accents / interactive links**: Shutter blue text (`text-brand-600`)

The Tailwind palette is defined in `tailwind.config.js`:

- `bone` — neutral scale (50 = near-white, 950 = Shutter black `#051016`)
- `moss` — Shutter yellow scale (500 = `#fde12d`)
- `brand` — Shutter blue scale (600 = `#0044a4`)

Class names are aliased to `bone` / `moss` for legacy reasons — `brand` is the new addition for the blue accents.

---



## Tech Stack


| Layer        | Library                       |
| ------------ | ----------------------------- |
| Framework    | React 19 + Vite 8             |
| Wallet       | wagmi v2, RainbowKit, viem v2 |
| Server state | TanStack Query v5             |
| Routing      | React Router v7               |
| Styling      | Tailwind CSS v3               |
| Lint         | oxlint                        |


