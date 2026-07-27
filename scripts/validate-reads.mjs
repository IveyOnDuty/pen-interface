/**
 * Phase 2 — automated read-path validation against Sepolia contracts.
 * Mirrors the RPC calls made by useDashboard, usePaymentAsset, useTranches,
 * useDisbursements, useBuySeats (quote), and useRefundSeats (quote).
 *
 * Usage: node scripts/validate-reads.mjs
 * Requires: VITE_RPC_SEPOLIA and Sepolia contract addresses in .env
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  http,
  parseAbi,
  parseAbiItem,
} from 'viem'
import { sepolia } from 'viem/chains'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  const env = {}
  try {
    const raw = readFileSync(resolve(root, '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m) env[m[1]] = m[2].trim()
    }
  } catch {
    /* .env optional — fall back to defaults below */
  }
  return env
}

const env = loadEnv()
const rpc = env.VITE_RPC_SEPOLIA || 'https://ethereum-sepolia-rpc.publicnode.com'
const seatToken = env.VITE_SEPOLIA_SEAT_TOKEN ?? '0x0cC04c4F133A796F894B9Cb0Cc14b93D559c5488'
const bondingTranche = env.VITE_SEPOLIA_BONDING_TRANCHE ?? '0x070518E29C6523a05cF3A3E0F9cEE13e593c9F3c'
const principalManager = env.VITE_SEPOLIA_PRINCIPAL_MANAGER ?? '0x199ce359dc4Fa0fd2300F11294B27024F7cb55eF'
const deployBlock = BigInt(env.VITE_SEPOLIA_PRINCIPAL_MANAGER_DEPLOY_BLOCK ?? '11022056')

const client = createPublicClient({ chain: sepolia, transport: http(rpc) })

const seatTokenAbi = parseAbi([
  'function totalSupply() view returns (uint256)',
  'function supplyCap() view returns (uint256)',
  'function inactivityPeriod() view returns (uint48)',
])
const bondingAbi = parseAbi([
  'function asset() view returns (address)',
  'function currentSeatPrice() view returns (uint256)',
  'function refundPrice() view returns (uint256)',
  'function trancheCount() view returns (uint256)',
  'function tranche(uint256 index) view returns (uint256 upperBound, uint256 pricePerSeat)',
  'function quotePurchase(uint256 amount) view returns (uint256)',
  'function quoteRefund(uint256 amount) view returns (uint256)',
])
const principalAbi = parseAbi([
  'function totalManagedAssets() view returns (uint256)',
  'function accountedPrincipal() view returns (uint256)',
  'function availableYield() view returns (uint256)',
  'function liquidAssets() view returns (uint256)',
  'function deployedAssets() view returns (uint256)',
])
const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

const FUNDING_EXECUTED = parseAbiItem(
  'event FundingExecuted(address[] indexed recipients, uint256[] amounts)',
)

const CHUNK_SIZE = 5_000n

async function getLogsChunked(address, fromBlock) {
  const latest = await client.getBlockNumber()
  try {
    return await client.getLogs({ address, event: FUNDING_EXECUTED, fromBlock, toBlock: latest })
  } catch {
    const logs = []
    let from = fromBlock
    while (from <= latest) {
      const to = from + CHUNK_SIZE - 1n < latest ? from + CHUNK_SIZE - 1n : latest
      try {
        const chunk = await client.getLogs({ address, event: FUNDING_EXECUTED, fromBlock: from, toBlock: to })
        logs.push(...chunk)
      } catch { /* skip failed chunk */ }
      from = to + 1n
    }
    return logs
  }
}

const results = []

async function check(name, fn) {
  try {
    const value = await fn()
    results.push({ name, ok: true, detail: value })
    console.log(`  ✓ ${name}`)
    return value
  } catch (e) {
    const msg = e?.shortMessage ?? e?.message ?? String(e)
    results.push({ name, ok: false, detail: msg })
    console.log(`  ✗ ${name}: ${msg}`)
    return undefined
  }
}

console.log(`\nPhase 2 — Sepolia read validation`)
console.log(`RPC: ${rpc}\n`)

// Metrics / useDashboard
console.log('Metrics (useDashboard):')
await check('totalSupply', () => client.readContract({ address: seatToken, abi: seatTokenAbi, functionName: 'totalSupply' }))
await check('supplyCap', () => client.readContract({ address: seatToken, abi: seatTokenAbi, functionName: 'supplyCap' }))
await check('currentSeatPrice', () => client.readContract({ address: bondingTranche, abi: bondingAbi, functionName: 'currentSeatPrice' }))
await check('refundPrice', () => client.readContract({ address: bondingTranche, abi: bondingAbi, functionName: 'refundPrice' }))
await check('trancheCount', () => client.readContract({ address: bondingTranche, abi: bondingAbi, functionName: 'trancheCount' }))
await check('totalManagedAssets', () => client.readContract({ address: principalManager, abi: principalAbi, functionName: 'totalManagedAssets' }))
await check('accountedPrincipal', () => client.readContract({ address: principalManager, abi: principalAbi, functionName: 'accountedPrincipal' }))
await check('availableYield', () => client.readContract({ address: principalManager, abi: principalAbi, functionName: 'availableYield' }))
await check('liquidAssets', () => client.readContract({ address: principalManager, abi: principalAbi, functionName: 'liquidAssets' }))
await check('deployedAssets', () => client.readContract({ address: principalManager, abi: principalAbi, functionName: 'deployedAssets' }))

// Payment asset / usePaymentAsset
console.log('\nPayment asset (usePaymentAsset):')
const assetAddr = await check('BondingTranche.asset()', () =>
  client.readContract({ address: bondingTranche, abi: bondingAbi, functionName: 'asset' }))
if (assetAddr) {
  await check('ERC20.symbol', () => client.readContract({ address: assetAddr, abi: erc20Abi, functionName: 'symbol' }))
  await check('ERC20.decimals', () => client.readContract({ address: assetAddr, abi: erc20Abi, functionName: 'decimals' }))
}

// Tranches / useTranches
console.log('\nTranches (useTranches):')
await check('tranche(0)', () =>
  client.readContract({ address: bondingTranche, abi: bondingAbi, functionName: 'tranche', args: [0n] }))

// Buy & Refund quotes
console.log('\nBuy / Refund quotes:')
await check('quotePurchase(1)', () =>
  client.readContract({ address: bondingTranche, abi: bondingAbi, functionName: 'quotePurchase', args: [1n] }))
await check('quoteRefund(1)', () =>
  client.readContract({ address: bondingTranche, abi: bondingAbi, functionName: 'quoteRefund', args: [1n] }))

// Activity (protocol-level read; wallet-specific reads need a connected address)
console.log('\nActivity (useSeatActivity — protocol reads):')
await check('inactivityPeriod', () =>
  client.readContract({ address: seatToken, abi: seatTokenAbi, functionName: 'inactivityPeriod' }))

// Disbursements / useDisbursements
console.log('\nDisbursements (useDisbursements):')
await check('FundingExecuted logs', async () => {
  const logs = await getLogsChunked(principalManager, deployBlock)
  return `${logs.length} event(s) since block ${deployBlock}`
})

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.log('\nFailed:')
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`)
  process.exit(1)
}
console.log('\nAll automated read checks passed. Complete manual wallet flows in the UI (Buy, Refund, Activity with connected wallet).\n')
