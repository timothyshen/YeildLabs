import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

/**
 * Octav Historical Portfolio API Integration
 * Fetches historical portfolio snapshots for performance tracking
 * 
 * Based on: https://docs.octav.fi/api/endpoints/historical-portfolio
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!address) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Wallet address is required',
      }, { status: 400 });
    }

    if (days < 1 || days > 365) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Days must be between 1 and 365',
      }, { status: 400 });
    }

    const octavApiKey = process.env.OCTAV_API_KEY;

    if (!octavApiKey) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'OCTAV_API_KEY not configured',
      }, { status: 500 });
    }

    console.log(`📊 Fetching ${days} days of historical data for:`, address);

    const snapshots = [];
    const errors = [];

    // Fetch historical data for each day
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      try {
        const response = await fetch(
          `https://api.octav.fi/v1/historical?addresses=${address}&date=${dateStr}`,
          {
            headers: {
              'Authorization': `Bearer ${octavApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Handle both array and single object responses
          const snapshot = Array.isArray(data) ? data[0] : data;
          if (snapshot) {
            snapshots.push({
              date: dateStr,
              timestamp: date.getTime(),
              ...snapshot,
            });
          }
        } else {
          // Some dates might not have data, that's okay
          const errorData = await response.json().catch(() => ({}));
          if (response.status !== 404) {
            errors.push({ date: dateStr, error: errorData.message || `HTTP ${response.status}` });
          }
        }
      } catch (error) {
        errors.push({ date: dateStr, error: error instanceof Error ? error.message : 'Unknown error' });
      }

      // Small delay to avoid rate limiting
      if (i < days - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sort by date (oldest first)
    snapshots.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`✅ Fetched ${snapshots.length} historical snapshots (${errors.length} errors)`);

    return NextResponse.json<ApiResponse<typeof snapshots>>({
      success: true,
      data: snapshots,
    });
  } catch (error) {
    console.error('❌ Historical API error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch historical data',
    }, { status: 500 });
  }
}

