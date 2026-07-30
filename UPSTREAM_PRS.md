# Upstream pull requests

Open these PRs against [shutter-network/pen-interface](https://github.com/shutter-network/pen-interface):

| Branch | Title | Open PR |
|--------|-------|---------|
| `upstream-pr/branding-pen-logo` | Replace Shutter signet with PEN logo assets | https://github.com/shutter-network/pen-interface/compare/main...IveyOnDuty:upstream-pr/branding-pen-logo |
| `upstream-pr/snapshot-voting-link` | Point Voting URL at Snapshot space | https://github.com/shutter-network/pen-interface/compare/main...IveyOnDuty:upstream-pr/snapshot-voting-link |
| `upstream-pr/ci-and-tests` | Add CI workflow and format utility tests | https://github.com/shutter-network/pen-interface/compare/main...IveyOnDuty:upstream-pr/ci-and-tests |

## First GitHub Issue (fork)

Title: **Track production deploy CIDs**

Use the [Production deploy](.github/ISSUE_TEMPLATE/production-deploy.md) issue template on your fork.

Body starter:

```
## Build
- Branch: main @ v1.0.0-mainnet
- Build command: npm run build

## IPFS
- Previous CID: bafybeidnbi7nfejtu5tqhnpdi4uuhz6r3axibyf35cy724jrntctwuqwry
- New CID: (fill after Pinata upload)

## Notes
Logo rebrand build — upload dist/ and update ENS contenthash on shutterpen.eth.
See DEPLOYMENTS.md for history.
```
