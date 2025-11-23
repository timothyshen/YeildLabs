import { NextRequest, NextResponse } from 'next/server';
import {
  getApprovalTransaction,
  getSpenderAddress,
  checkAllowance,
  toWei,
} from '@/lib/1inch/client';
import { is1inchConfigured, BASE_CHAIN_ID, type ChainId } from '@/lib/1inch/config';
import type { ApiResponse } from '@/types';

/**
 * 1inch Token Approval API
 * Handles checking allowances and generating approval transactions
 */

/**
 * GET - Check current allowance
 * GET /api/1inch/approve?tokenAddress=<address>&walletAddress=<address>&chainId=<chainId>
 */
export async function GET(request: NextRequest) {
  try {
    if (!is1inchConfigured()) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: '1inch API key not configured',
      }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('tokenAddress');
    const walletAddress = searchParams.get('walletAddress');
    const chainId = parseInt(searchParams.get('chainId') || String(BASE_CHAIN_ID)) as ChainId;

    if (!tokenAddress || !walletAddress) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required parameters: tokenAddress, walletAddress',
      }, { status: 400 });
    }

    console.log('🔍 Checking token allowance:', {
      tokenAddress,
      walletAddress,
      chainId,
    });

    const allowanceResponse = await checkAllowance({
      tokenAddress,
      walletAddress,
    }, chainId);

    console.log('✅ Current allowance:', allowanceResponse.allowance);

    return NextResponse.json<ApiResponse<{ allowance: string }>>({
      success: true,
      data: allowanceResponse,
    });
  } catch (error) {
    console.error('❌ Error checking allowance:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check allowance',
    }, { status: 500 });
  }
}

/**
 * POST - Generate approval transaction
 * POST /api/1inch/approve
 * Body: { tokenAddress, amount?, chainId? }
 */
export async function POST(request: NextRequest) {
  try {
    if (!is1inchConfigured()) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: '1inch API key not configured',
      }, { status: 503 });
    }

    const body = await request.json();
    const {
      tokenAddress,
      amount,
      decimals = 18,
      chainId = BASE_CHAIN_ID,
    } = body;

    if (!tokenAddress) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Missing required parameter: tokenAddress',
      }, { status: 400 });
    }

    console.log('📝 Generating approval transaction:', {
      tokenAddress,
      amount,
      chainId,
    });

    // Get spender address (1inch router)
    const spenderResponse = await getSpenderAddress(chainId);
    console.log('✅ Spender address:', spenderResponse.address);

    // Convert amount to wei if provided
    const amountWei = amount ? toWei(amount, decimals) : undefined;

    // Get approval transaction
    const approvalTx = await getApprovalTransaction({
      tokenAddress,
      amount: amountWei,
    }, chainId);

    console.log('✅ Approval transaction prepared:', {
      to: approvalTx.to,
      data: approvalTx.data,
    });

    return NextResponse.json<ApiResponse<{
      tx: typeof approvalTx;
      spender: string;
    }>>({
      success: true,
      data: {
        tx: approvalTx,
        spender: spenderResponse.address,
      },
    });
  } catch (error) {
    console.error('❌ Error generating approval transaction:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate approval transaction',
    }, { status: 500 });
  }
}
