import { NextRequest, NextResponse } from 'next/server';
import { testEndpointVariations, exploreAllEndpoints } from '@/lib/pendle/apiExplorer';

/**
 * Pendle API Explorer Route
 * 
 * Helps discover correct API endpoint paths
 * 
 * Usage:
 * GET /api/pendle/explore?endpoint=markets
 * GET /api/pendle/explore?all=true
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const all = searchParams.get('all') === 'true';
    const chainId = parseInt(searchParams.get('chainId') || '8453');

    if (all) {
      // Test all common endpoints
      const results = await exploreAllEndpoints(chainId);
      return NextResponse.json({
        success: true,
        results,
      });
    }

    if (endpoint) {
      // Test specific endpoint
      const results = await testEndpointVariations(endpoint, chainId);
      const success = results.find(r => r.success);
      
      return NextResponse.json({
        success: !!success,
        endpoint,
        results,
        workingPath: success?.path,
        sampleResponse: success?.response,
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Please provide ?endpoint=<name> or ?all=true',
      examples: {
        testEndpoint: '/api/pendle/explore?endpoint=markets',
        testAll: '/api/pendle/explore?all=true',
      },
    }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

