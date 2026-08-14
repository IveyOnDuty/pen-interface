export const BondingTrancheAbi = [
  { name: 'asset', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'quotePurchase', type: 'function', stateMutability: 'view', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'quoteRefund', type: 'function', stateMutability: 'view', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'currentSeatPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'refundPrice', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'trancheCount', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    name: 'tranche',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ name: 'upperBound', type: 'uint256' }, { name: 'pricePerSeat', type: 'uint256' }],
  },
  {
    name: 'purchase',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'maxCost', type: 'uint256' },
    ],
    outputs: [{ name: 'totalCost', type: 'uint256' }],
  },
  {
    name: 'multiPurchase',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'maxCost', type: 'uint256' },
    ],
    outputs: [{ name: 'totalCost', type: 'uint256' }],
  },
  {
    name: 'refund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'refundAmount', type: 'uint256' }],
  },
] as const
