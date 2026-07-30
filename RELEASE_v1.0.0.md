# Release v1.0.0 — mainnet production

**Date:** 2026-07-30  
**Branch:** `development`  
**Tag:** `v1.0.0-mainnet`

## Summary

Production-ready Shutter PEN frontend with mainnet contract support, PEN logo branding, governance links, CI, and unit tests.

## Changes since upstream

- PEN logo assets (sidebar + favicon) replacing legacy Shutter signet
- Live governance links: Holders.Vote forum and Snapshot voting space
- Mainnet contract addresses in `.env.example` (from shutter-pen-deployment-artifacts)
- WalletConnect project ID required from env at build time
- Copy-to-clipboard on Links page contract addresses
- GitHub Actions CI (lint, test, build)
- Vitest unit tests for `src/lib/format.ts`
- Deployment runbook and CID tracking docs

## Deploy

1. `npm run build` with `.env.production.local` configured
2. Upload `dist/` to Pinata
3. Update ENS `contenthash` on `shutterpen.eth`
4. Record CID in [DEPLOYMENTS.md](./DEPLOYMENTS.md)

## Test plan

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Gateway smoke test (logo, favicon, wallet, routes)
- [ ] Links → Forum and Voting open correct URLs

## Governance (mainnet)

- **SeatToken:** `0x814E141206b69afE94F298c080D8431e23473aB0`
- **Snapshot:** [s:shutterpen.eth](https://snapshot.box/#/s/shutterpen.eth)
- **Forum:** [shutterpen.eth on Holders.Vote](https://holders.vote/h/shutterpen.eth)
