# PEN Frontend — Technical Overview

> Reference document generated from repository analysis.  
> **Project:** Perpetual Endowment Network (PEN) — a SEAT-based treasury protocol on Ethereum.

---

## Framework and Language

| Aspect | Detail |
|---|---|
| **UI framework** | [React](https://react.dev/) 19 |
| **Language** | TypeScript (~6.0) |
| **Module system** | ES modules (`"type": "module"`) |
| **Compiler target** | ES2023 (see `tsconfig.app.json`) |

The app is a client-only single-page application (SPA). There is no server-side rendering (`ssr: false` in wagmi config).

---

## Package Manager

| Aspect | Detail |
|---|---|
| **Primary manager** | **npm** |
| **Lockfile** | `package-lock.json` |
| **Alternatives** | README notes `pnpm` / `yarn` are compatible, but npm is the canonical choice |

---

## Folder Structure

```
pen-interface/
├── index.html                 # HTML shell; loads /src/main.tsx
├── package.json
├── package-lock.json
├── vite.config.ts             # Vite build config (base: './' for IPFS)
├── tailwind.config.js         # Tailwind theme (bone / moss / brand palettes)
├── postcss.config.js
├── tsconfig.json              # Project references root
├── tsconfig.app.json          # App TypeScript config
├── tsconfig.node.json         # Node/Vite config TypeScript
├── .env.example               # Environment variable template
├── .oxlintrc.json             # Linter config
├── README.md                  # Detailed project documentation
│
├── public/
│   └── _redirects             # SPA fallback rule (Netlify-style)
│
└── src/
    ├── main.tsx               # Application entry + provider stack
    ├── App.tsx                # Route definitions
    ├── index.css              # Tailwind directives + base styles
    │
    ├── config/
    │   ├── wagmi.ts           # Wallet/RPC configuration
    │   ├── contracts.ts       # Per-chain contract address resolution
    │   └── constants.ts       # Explorer URLs, deploy blocks
    │
    ├── abis/                  # TypeScript ABI exports
    │   ├── BondingTranche.ts
    │   ├── ERC20.ts
    │   ├── PrincipalManager.ts
    │   └── SeatToken.ts
    │
    ├── hooks/                 # Data fetching + transaction state machines
    │   ├── usePaymentAsset.ts
    │   ├── useDashboard.ts
    │   ├── useTranches.ts
    │   ├── useDisbursements.ts
    │   ├── useSeatActivity.ts
    │   ├── useBuySeats.ts
    │   └── useRefundSeats.ts
    │
    ├── components/
    │   ├── layout/            # Layout, Sidebar, TopBar, WalletButtons
    │   ├── dashboard/         # StatCard, TrancheProgress
    │   └── seats/             # BuyForm, RefundForm, ActivityView
    │
    ├── pages/
    │   ├── Dashboard.tsx      # /metrics — protocol metrics & treasury
    │   ├── Seats.tsx          # /seats — buy, refund, activity
    │   └── Links.tsx          # /links — resources & contract addresses
    │
    └── lib/
        └── format.ts          # Display formatting helpers
```

---

## Entry Point

1. **`index.html`** — mounts React on `#root` and loads the module entry:
   ```html
   <script type="module" src="/src/main.tsx"></script>
   ```

2. **`src/main.tsx`** — bootstraps the provider stack and renders `<App />`.

---

## Routing

| Library | [React Router](https://reactrouter.com/) v7 |
|---|---|
| **Router type** | `HashRouter` (hash-based URLs — suitable for IPFS/static hosting) |
| **Layout** | Nested routes under `<Layout />` (sidebar + top bar + `<Outlet />`) |

| Path | Component | Notes |
|---|---|---|
| `/` | Redirect → `/seats` | Default landing page |
| `/seats` | `Seats` | Buy, refund, and activity tabs |
| `/metrics` | `Dashboard` | Protocol stats, tranches, treasury, disbursements |
| `/links` | `Links` | External resources and on-chain addresses |
| `/activity` | Redirect → `/seats` | Legacy URL compatibility |

Route definitions live in `src/App.tsx`.

---

## State Management

There is **no global client store** (no Redux, Zustand, Jotai, etc.). State is layered as follows:

| Layer | Library / Pattern | Purpose |
|---|---|---|
| **Wallet state** | [wagmi](https://wagmi.sh/) v2 | Account, chain, connectors, contract reads/writes |
| **Async / cached data** | [TanStack Query](https://tanstack.com/query) v5 | RPC read caching, log queries, invalidation after txs |
| **Local UI state** | React `useState` / `useEffect` | Form inputs, multi-step buy/refund flows, copy buttons |
| **Config resolution** | Module-level caches | `getContracts()` address cache per chain |

Custom hooks encapsulate domain logic and transaction state machines (`useBuySeats`, `useRefundSeats`).

---

## Styling Solution

| Tool | Role |
|---|---|
| **[Tailwind CSS](https://tailwindcss.com/)** v3 | Utility-first styling |
| **PostCSS** + **Autoprefixer** | CSS processing pipeline |
| **[@fontsource-variable/inter](https://fontsource.org/)** | Inter Variable font |
| **RainbowKit CSS** | Wallet modal styles (`@rainbow-me/rainbowkit/styles.css`) |

**Design system:** Shutter brand palette defined in `tailwind.config.js`:

- `bone` — neutral scale (body text, surfaces)
- `moss` — Shutter yellow (`#fde12d`) — primary buttons
- `brand` — Shutter blue (`#0044a4`) — headers, accents

Global base styles are in `src/index.css`.

---

## Build Tool

| Tool | Version | Notes |
|---|---|---|
| **[Vite](https://vite.dev/)** | 8.x | Dev server + production bundler |
| **@vitejs/plugin-react** | 6.x | React Fast Refresh |
| **TypeScript** | `tsc -b` | Type-check before build |

### npm Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Dev server (default: `http://localhost:5173`) |
| `build` | `tsc -b && vite build` | Type-check + output to `dist/` |
| `preview` | `vite preview` | Serve production build locally |
| `lint` | `oxlint` | Fast linting |

### Build Configuration Highlights

- `base: './'` in `vite.config.ts` — **relative asset paths** for IPFS / static hosting
- Output directory: `dist/`

---

## Environment Variables

All env vars use the **`VITE_` prefix** (inlined at build time by Vite). Copy `.env.example` → `.env`.

| Variable | Required | Description |
|---|---|---|
| `VITE_WALLETCONNECT_PROJECT_ID` | Optional | WalletConnect Cloud project ID (documented; see note below) |
| `VITE_RPC_SEPOLIA` | Recommended | Sepolia RPC (Alchemy/Infura) — needed for reliable `eth_getLogs` |
| `VITE_RPC_MAINNET` | Recommended | Mainnet RPC |
| `VITE_SEPOLIA_SEAT_TOKEN` | Yes | SeatToken contract on Sepolia |
| `VITE_SEPOLIA_BONDING_TRANCHE` | Yes | BondingTranche contract on Sepolia |
| `VITE_SEPOLIA_PRINCIPAL_MANAGER` | Yes | PrincipalManager contract on Sepolia |
| `VITE_SEPOLIA_PRINCIPAL_MANAGER_DEPLOY_BLOCK` | Recommended | Start block for log queries |
| `VITE_SEPOLIA_SAFE` | Optional | Governing Safe multisig (Links tab) |
| `VITE_SEPOLIA_EXPLORER_URL` | Optional | Block explorer base URL (default: Etherscan Sepolia) |
| `VITE_MAINNET_SEAT_TOKEN` | Optional | Mainnet SeatToken (enables mainnet in wallet) |
| `VITE_MAINNET_BONDING_TRANCHE` | Optional | Mainnet BondingTranche |
| `VITE_MAINNET_PRINCIPAL_MANAGER` | Optional | Mainnet PrincipalManager |
| `VITE_MAINNET_PRINCIPAL_MANAGER_DEPLOY_BLOCK` | Optional | Mainnet deploy block |
| `VITE_MAINNET_SAFE` | Optional | Mainnet Safe address |
| `VITE_MAINNET_EXPLORER_URL` | Optional | Mainnet explorer URL |

**Not env-configured:** Payment asset (ERC-20 address, symbol, decimals) is discovered on-chain via `BondingTranche.asset()`.

**Note:** `VITE_WALLETCONNECT_PROJECT_ID` appears in `.env.example` and README, but `src/config/wagmi.ts` currently passes a hardcoded `projectId: 'pen-frontend'` to RainbowKit's `getDefaultConfig`. Wiring the env var may be needed for production WalletConnect usage.

Supported chains in the wallet modal are determined dynamically by which `VITE_*_SEAT_TOKEN` addresses are set (`getSupportedChains()` in `src/config/contracts.ts`).

---

## Wallet Libraries

| Library | Version | Role |
|---|---|---|
| **[wagmi](https://wagmi.sh/)** | v2 | React hooks for Ethereum (reads, writes, account, chain) |
| **[viem](https://viem.sh/)** | v2 | Low-level Ethereum client (used directly for log queries, ABI parsing) |
| **[@rainbow-me/rainbowkit](https://www.rainbowkit.com/)** | v2 | Wallet connection UI and connector management |

**Supported chains:** Ethereum Sepolia and Mainnet (filtered by configured contract addresses).

**Connectors:** Provided by RainbowKit's `getDefaultConfig` (injected wallets, WalletConnect, etc.).

**Custom fix:** `src/config/wagmi.ts` patches restored localStorage connectors with missing methods (`getChainId`, `getProvider`, etc.) so writes work immediately after page reload.

---

## Smart Contract Interaction Libraries

| Approach | Detail |
|---|---|
| **Primary** | wagmi hooks — `useReadContract`, `useReadContracts`, `useWriteContract`, `useWaitForTransactionReceipt`, `usePublicClient` |
| **ABIs** | Hand-written TypeScript ABI constants in `src/abis/` |
| **Low-level** | viem — `parseAbiItem`, `getLogs`, `formatUnits`, multicall via wagmi |

### Protocol Contracts

| Contract | Purpose |
|---|---|
| **SeatToken** | ERC-20 (0 decimals) representing SEATs; activity tracking |
| **BondingTranche** | Tranche-based pricing; buy (`purchase`) and refund (`refund`) |
| **PrincipalManager** | Treasury vault; yield disbursements (`FundingExecuted` events) |
| **ERC-20 (payment asset)** | Discovered dynamically; used for approve/allowance on purchases |

All contract addresses are resolved per chain from environment variables via `getContracts(chainId)`.

---

## API Integrations

There is **no backend REST/GraphQL API**. All application data comes from on-chain reads and events.

| Integration | Type | Usage |
|---|---|---|
| **Ethereum RPC** | JSON-RPC via wagmi/viem | Contract reads, writes, `eth_getLogs`, block timestamps |
| **Block explorers** | External links (Etherscan URLs from env) | Transaction and address links |
| **holders.vote** | External link | Community forum (`Links` page) |
| **Snapshot** | External link | Off-chain voting (`Links` page) |

No axios, fetch-to-API, or third-party indexing services are used in the codebase.

---

## Deployment Target

| Target | Detail |
|---|---|
| **Primary** | **Static hosting on IPFS** — fully client-side bundle after `npm run build` |
| **URL stability** | ENS `contenthash` or DNSLink recommended for stable URLs across redeploys |
| **Secondary signals** | `public/_redirects` suggests Netlify-style SPA hosting is also supported |
| **Routing** | `HashRouter` + `base: './'` optimized for IPFS gateways and path-less static hosts |

### Recommended IPFS Pinning Options (from README)

4EVERLAND, web3.storage/Storacha, Filebase, Pinata, or local IPFS daemon.

### Deployment Considerations

- Env vars are **baked at build time** — rebuild and re-pin for config changes
- RPC URLs are **public in the bundle** — use rate-limited Alchemy/Infura keys
- WalletConnect project allowlist must include all served domains (IPFS gateways, ENS, custom domains)
- Test on a real IPFS gateway after pinning, not just `vite preview`

---

## Setup Prerequisites

1. **Node.js 20+**
2. **npm** (or compatible package manager)
3. **Ethereum wallet** — MetaMask or any WalletConnect-compatible wallet
4. **RPC endpoint** with high `eth_getLogs` limits (Alchemy or Infura recommended; public RPCs may fail on disbursement history queries)
5. **Optional:** WalletConnect Cloud project ID for mobile / WalletConnect wallets
6. **Optional:** Contract addresses for mainnet when mainnet deployment is live

### Quick Start

```bash
npm install
cp .env.example .env    # fill in RPC URL and contract addresses
npm run dev             # http://localhost:5173
```

### Production Build

```bash
npm run build           # outputs to dist/
npm run preview         # local sanity check
```

---

## Provider Stack (Runtime Architecture)

```
WagmiProvider (wagmiConfig)
  └── QueryClientProvider (TanStack Query)
        └── RainbowKitProvider
              └── HashRouter
                    └── App (Routes)
                          └── Layout
                                ├── Sidebar
                                ├── TopBar (+ WalletButtons)
                                └── Outlet (page content)
```

---

## Key User Flows (On-Chain)

| Flow | Contracts / Methods |
|---|---|
| **Buy SEATs** | ERC-20 `approve` → `BondingTranche.purchase` |
| **Refund SEATs** | `BondingTranche.refund` (no ERC-20 approval needed) |
| **View activity** | `SeatToken.lastActivityAt`, `inactivityPeriod`, `isInactive` |
| **Dashboard metrics** | Multicall reads across SeatToken, BondingTranche, PrincipalManager |
| **Disbursement history** | `eth_getLogs` for `FundingExecuted` on PrincipalManager |

---

## Linting

- **Tool:** [oxlint](https://oxc.rs/docs/guide/usage/linter.html) v1.x
- **Config:** `.oxlintrc.json`
- **Run:** `npm run lint`

---

## Summary Table

| Category | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Package manager | npm |
| Build tool | Vite 8 |
| Routing | React Router 7 (`HashRouter`) |
| State | wagmi + TanStack Query + local React state |
| Styling | Tailwind CSS 3 |
| Wallets | wagmi 2 + RainbowKit 2 + viem 2 |
| Contracts | wagmi/viem with TS ABIs |
| Backend | None (fully on-chain + static frontend) |
| Deploy | IPFS (static SPA), optionally Netlify |
