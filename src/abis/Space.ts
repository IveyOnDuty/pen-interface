// Minimal fragment of the Snapshot X `Space` contract — just what the UI needs to
// discover the latest proposal, its voting-window block range, and its voters.
export const SpaceAbi = [
  // Id of the NEXT proposal to be created; latest proposal id = nextProposalId - 1.
  { name: 'nextProposalId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  // Per-proposal data. We read startBlockNumber / maxEndBlockNumber to bound the VoteCast log scan.
  {
    name: 'proposals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'author', type: 'address' },
      { name: 'startBlockNumber', type: 'uint32' },
      { name: 'executionStrategy', type: 'address' },
      { name: 'minEndBlockNumber', type: 'uint32' },
      { name: 'maxEndBlockNumber', type: 'uint32' },
      { name: 'finalizationStatus', type: 'uint8' },
      { name: 'executionPayloadHash', type: 'bytes32' },
      { name: 'activeVotingStrategies', type: 'uint256' },
    ],
  },
  // Emitted once per vote. None of the params are indexed, so voters are collected by
  // scanning logs over the proposal's block window and filtering by proposalId in JS.
  {
    name: 'VoteCast',
    type: 'event',
    inputs: [
      { name: 'proposalId', type: 'uint256', indexed: false },
      { name: 'voter', type: 'address', indexed: false },
      { name: 'choice', type: 'uint8', indexed: false },
      { name: 'votingPower', type: 'uint256', indexed: false },
    ],
  },
] as const
