# Deployment runbook

Step-by-step guide for shipping a new build of the Shutter PEN frontend to IPFS and `shutterpen.eth`.

## Prerequisites

- Node.js 20+
- `.env.production.local` filled with production values (RPC keys, WalletConnect project ID)
- Pinata account (or another IPFS pinning service)
- Wallet that controls `shutterpen.eth` ENS on Ethereum mainnet

## 1. Build

```bash
npm ci
npm run lint
npm run build
npm run preview   # optional local sanity check at http://localhost:4173
```

Production builds read from `.env.production` and `.env.production.local`. All `VITE_*` values are baked into the bundle at build time — changing env requires a full rebuild and re-pin.

**One CID per environment:** Sepolia staging and mainnet production need separate builds if contract addresses differ.

## 2. Pin to Pinata

1. Open [pinata.cloud](https://pinata.cloud) → **Upload** → **Folder**
2. Upload the contents of `dist/` so `index.html` sits at the **root** of the CID (not inside an extra wrapper folder)
3. Copy the new **CID**

Alternative (CLI):

```bash
npm run deploy:ipfs   # Storacha/w3cli — requires w3 login first
```

## 3. Smoke-test on a real gateway

Do not skip this step. `npm run preview` misses gateway-specific behavior.

```
https://<CID>.ipfs.dweb.link
https://<CID>.ipfs.inbrowser.link
```

Verify:

- Routes: Metrics, SEATs (Buy / Refund / Activity), Links
- WalletConnect connects (Reown allowlist must include `*.eth.limo`, `*.eth.link`, `*.ipfs.dweb.link`)
- Contract reads load (use Alchemy/Infura RPC in the build, not a public endpoint)
- Logo and favicon render correctly

## 4. Update ENS contenthash

1. Open your ENS manager (app.ens.domains or your resolver UI)
2. On **`shutterpen.eth`**, set the **contenthash** record to the new CID
3. Wait for propagation (minutes to hours)

Stable URLs after update:

- `https://shutterpen.eth.limo`
- `https://shutterpen.eth.link`

## 5. Post-deploy

1. Add the CID to [DEPLOYMENTS.md](./DEPLOYMENTS.md)
2. Open a GitHub Issue or Release on the fork documenting the deploy
3. Click through Links → Forum and Voting from the live site

## WalletConnect / Reown allowlist

In [dashboard.reown.com](https://dashboard.reown.com), ensure the project allowlist includes every domain you serve from:

- `shutterpen.eth.limo`
- `shutterpen.eth.link`
- `*.ipfs.dweb.link`
- `*.ipfs.inbrowser.link`

## Common gotchas

| Problem | Fix |
|---------|-----|
| Page 404 on gateway | Re-upload so `index.html` is at CID root, not nested |
| Pinata HTML block on public gateway | Use `dweb.link` / `inbrowser.link`, not Pinata's public gateway |
| WalletConnect errors on deployed site | Add gateway domain to Reown allowlist; rebuild if project ID changed |
| Disbursements empty / RPC errors | Use Alchemy/Infura with high log limits; set deploy block in env |
| Favicon stale after deploy | Bump `?v=` query param in `index.html` |

## Mainnet contract addresses

From [shutter-pen-deployment-artifacts](https://github.com/shutter-network/shutter-pen-deployment-artifacts):

| Contract | Mainnet |
|----------|---------|
| SeatToken | `0xe2F401A0fb40dA191b9fa8C44Fa09D31cE17374c` |
| BondingTranche | `0x652a9A770f9Cfe26e409Aa63E84B8a4e21abe1e5` |
| PrincipalManager | `0x4517651c7071fecDA97Eb656a9d3A50B92b84517` |
| Safe | `0xB7f69C3cd9E3dFB4aE0Ed9ee65eb2Ed42EdeECE3` |

See `.env.example` for the full variable list.
