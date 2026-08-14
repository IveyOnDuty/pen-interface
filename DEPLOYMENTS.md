# Production deploy log

Track IPFS CIDs pinned for `shutterpen.eth`. Update this file after every production release.

| Date | CID | Notes | ENS updated |
|------|-----|-------|-------------|
| 2026-07-26 | `bafybeigaprvqjwrrtpqhqgnobudfmaqhge5bmgl5d5oj5nz3fpn6lqnew4` | Sepolia staging build — initial IPFS smoke test | Yes |
| 2026-07-27 | `bafybeidnbi7nfejtu5tqhnpdi4uuhz6r3axibyf35cy724jrntctwuqwry` | Rebuild with WalletConnect / Reown project ID | Yes |
| 2026-07-30 | *(pending Pinata upload)* | PEN logo rebrand + mainnet production env | Pending |
| 2026-08-14 | `Qmciz56hjtRAwRGqejY1x28YBE1RzdAT8J4XfitZrqSGCT` | Upstream sync: refresh activity, CSV batch buy, new mainnet contracts | Pending |

## Gateway smoke-test URLs

After pinning, verify before updating ENS:

```
https://<CID>.ipfs.dweb.link
https://<CID>.ipfs.inbrowser.link
```

Checklist per release:

- [ ] Sidebar PEN logo (white on blue strip)
- [ ] Browser tab favicon (blue `#0044a4`)
- [ ] WalletConnect modal connects on gateway domain
- [ ] Metrics, SEATs, and Links routes load
- [ ] Links → Forum and Voting open Holders.Vote and Snapshot

## Related

- Runbook: [DEPLOYMENT.md](./DEPLOYMENT.md)
- ENS name: `shutterpen.eth` → contenthash points at latest production CID
