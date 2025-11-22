/**
 * Pendle API Explorer
 * 
 * Interactive tool to discover correct API endpoints
 * Run this to find the actual endpoint paths
 */

import { PENDLE_API_BASE } from './config';

export interface EndpointTest {
  path: string;
  status: number;
  success: boolean;
  response?: any;
  error?: string;
}

/**
 * Test multiple endpoint variations
 */
export async function testEndpointVariations(
  baseName: string,
  chainId: number = 8453
): Promise<EndpointTest[]> {
  const variations = [
    // Common patterns
    `/v1/${baseName}`,
    `/v2/${baseName}`,
    `/core/v1/${baseName}`,
    `/core/v2/${baseName}`,
    `/api/v1/${baseName}`,
    `/api/v2/${baseName}`,
    `/core/${baseName}`,
    `/${baseName}`,
    // With chainId in path
    `/v1/${baseName}/${chainId}`,
    `/v2/${baseName}/${chainId}`,
    `/core/v1/${baseName}/${chainId}`,
    `/core/v2/${baseName}/${chainId}`,
  ];

  const results: EndpointTest[] = [];

  for (const path of variations) {
    try {
      const url = `${PENDLE_API_BASE}${path}?chainId=${chainId}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = await response.text();
      }

      results.push({
        path,
        status: response.status,
        success: response.ok,
        response: response.ok ? responseData : undefined,
        error: !response.ok ? (typeof responseData === 'string' ? responseData : JSON.stringify(responseData)) : undefined,
      });

      // If we found a working endpoint, we can stop
      if (response.ok) {
        console.log(`✅ Found working endpoint: ${path}`);
        break;
      }
    } catch (error) {
      results.push({
        path,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Test all common Pendle endpoints
 */
export async function exploreAllEndpoints(chainId: number = 8453) {
  const endpoints = ['markets', 'pools', 'tokens', 'yields', 'positions', 'assets'];
  const allResults: Record<string, EndpointTest[]> = {};

  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`);
    const results = await testEndpointVariations(endpoint, chainId);
    allResults[endpoint] = results;
    
    // Find successful result
    const success = results.find(r => r.success);
    if (success) {
      console.log(`✅ ${endpoint}: ${success.path}`);
    }
  }

  return allResults;
}

