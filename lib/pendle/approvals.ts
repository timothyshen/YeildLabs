/**
 * ERC20 Approval Utilities
 * 
 * Functions for checking and executing ERC20 token approvals
 */

import { type Address, encodeFunctionData, parseUnits, maxUint256 } from 'viem';
import { erc20Abi } from 'viem';

export interface ApprovalCheck {
  token: Address;
  spender: Address;
  amount: bigint;
  needsApproval: boolean;
  currentAllowance: bigint;
}

/**
 * ERC20 ABI for approval functions
 */
export const ERC20_APPROVAL_ABI = [
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
] as const;

/**
 * Check if approval is needed for a token
 */
export async function checkApproval(
  tokenAddress: Address,
  owner: Address,
  spender: Address,
  amount: bigint,
  publicClient: any // viem PublicClient
): Promise<ApprovalCheck> {
  try {
    const currentAllowance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [owner, spender],
    });

    const needsApproval = currentAllowance < amount;

    return {
      token: tokenAddress,
      spender,
      amount,
      needsApproval,
      currentAllowance: currentAllowance as bigint,
    };
  } catch (error) {
    console.error('Error checking approval:', error);
    // Assume approval is needed if we can't check
    return {
      token: tokenAddress,
      spender,
      amount,
      needsApproval: true,
      currentAllowance: 0n,
    };
  }
}

/**
 * Get approval transaction data
 */
export function getApprovalTransaction(
  tokenAddress: Address,
  spender: Address,
  amount: bigint | 'infinite' = 'infinite'
): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  const approvalAmount = amount === 'infinite' ? maxUint256 : amount;

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, approvalAmount],
  });

  return {
    to: tokenAddress,
    data,
    value: 0n,
  };
}

/**
 * Check if approvals are needed from SDK response
 */
export function getRequiredApprovals(
  requiredApprovals: Array<{ token: string; amount: string }> | undefined,
  userAddress: Address
): Array<{ token: Address; spender: Address; amount: bigint }> | null {
  if (!requiredApprovals || requiredApprovals.length === 0) {
    return null;
  }

  // Extract spender from the first approval (usually the router address)
  // For Pendle, the spender is typically the router contract
  // We'll need to get this from the transaction data or config
  // For now, return the tokens that need approval
  return requiredApprovals.map((approval) => ({
    token: approval.token as Address,
    spender: '0x0000000000000000000000000000000000000000' as Address, // Will be set from tx.to
    amount: BigInt(approval.amount),
  }));
}

/**
 * Check multiple approvals at once
 */
export async function checkMultipleApprovals(
  approvals: Array<{ token: Address; spender: Address; amount: bigint }>,
  owner: Address,
  publicClient: any
): Promise<ApprovalCheck[]> {
  return Promise.all(
    approvals.map((approval) =>
      checkApproval(approval.token, owner, approval.spender, approval.amount, publicClient)
    )
  );
}

