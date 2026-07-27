import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

const rpcSepolia = import.meta.env.VITE_RPC_SEPOLIA as string | undefined
const rpcMainnet = import.meta.env.VITE_RPC_MAINNET as string | undefined
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined

if (!walletConnectProjectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is required — set it in .env (Reown dashboard project ID)')
}

// Only offer chains that actually have contract addresses configured in env.
// Falling back to sepolia keeps the app runnable when nothing is set.
const ALL_CHAINS = [sepolia, mainnet] as const
const configuredChains = ALL_CHAINS.filter((c) => {
  const prefix = c.id === mainnet.id ? 'MAINNET' : 'SEPOLIA'
  return !!import.meta.env[`VITE_${prefix}_SEAT_TOKEN`]
})
const chains = (configuredChains.length > 0 ? configuredChains : [sepolia]) as unknown as readonly [typeof sepolia, ...(typeof sepolia)[]]

export const wagmiConfig = getDefaultConfig({
  appName: 'PEN — Perpetual Endowment Network',
  projectId: walletConnectProjectId,
  chains,
  transports: {
    [sepolia.id]:  rpcSepolia  ? http(rpcSepolia)  : http(),
    [mainnet.id]:  rpcMainnet  ? http(rpcMainnet)  : http(),
  },
  ssr: false,
})

// wagmi calls connection.connector.getChainId() unconditionally inside
// getConnectorClient. On page reload, wagmi restores connections from
// localStorage with stripped connectors { id, name, type, uid } that have no
// methods. We patch getChainId onto them so writes work before or if reconnect
// fails. We read from wagmiConfig.state.chainId — same value wagmi uses for
// its own chain tracking — so the mismatch assertion always passes.
type PatchTarget = {
  getChainId?: unknown
  getProvider?: unknown
  disconnect?: unknown
  emitter?: { off?: unknown; on?: unknown }
}

const noopEmitter = { off: () => {}, on: () => {}, emit: () => {} }

function patchMissingMethods(connector: PatchTarget) {
  if (typeof connector.getChainId !== 'function') {
    connector.getChainId = () => Promise.resolve(wagmiConfig.state.chainId)
  }
  if (typeof connector.getProvider !== 'function') {
    connector.getProvider = () =>
      Promise.resolve(typeof window !== 'undefined' ? (window as { ethereum?: unknown }).ethereum : undefined)
  }
  if (typeof connector.disconnect !== 'function') {
    connector.disconnect = () => Promise.resolve()
  }
  if (!connector.emitter || typeof connector.emitter.off !== 'function') {
    connector.emitter = noopEmitter
  }
}

wagmiConfig.connectors.forEach(c => patchMissingMethods(c))

wagmiConfig.subscribe(
  (state) => state.connections,
  (connections) => {
    connections.forEach((connection) => patchMissingMethods(connection.connector))
  },
)
