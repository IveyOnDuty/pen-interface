export const SeatTokenAbi = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'supplyCap', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'lastActivityAt', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint48' }] },
  { name: 'isInactive', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'inactivityPeriod', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint48' }] },
  // The Snapshot X Space this token verifies votes against (set once via setSpace).
  { name: 'space', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  // Permissionless batch activity refresh: refresh every voter of a single proposal in one tx.
  // Silently skips entries that aren't seat holders or didn't vote, so passing all voters is safe.
  { name: 'refreshActivityForProposalVoters', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'voters', type: 'address[]' }], outputs: [] },
] as const
