/**
 * Pendle API Explorer
 * 
 * Helper functions to explore and discover Pendle API endpoints
 * Use this to find the correct endpoint paths
 */

import { PENDLE_API_BASE } from './config';

/**
 * Try different endpoint variations to find the correct path
 */
export async function exploreEndpoint(
  basePath: string,
  chainId: number = 8453
) {
  const variations = [
    `/v1/${basePath}`,
    `/core/v1/${basePath}`,
    `/api/v1/${basePath}`,
    `/core/${basePath}`,
    `/${basePath}`,
  ];

  const results = [];

  for (const path of variations) {
    try {
      const url = `${PENDLE_API_BASE}${path}?chainId=${chainId}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      results.push({
        path,
        status: response.status,
        success: response.ok,
        url,
      });

      if (response.ok) {
        const data = await response.json();
        return { path, data, success: true };
      }
    } catch (error) {
      results.push({
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      });
    }
  }

  return { results, success: false };
}

/**
 * Test common Pendle API endpoints
 */
export async function testCommonEndpoints(chainId: number = 8453) {
  const endpoints = ['markets', 'pools', 'tokens', 'yields', 'positions'];
  const results: Record<string, any> = {};

  for (const endpoint of endpoints) {
    const result = await exploreEndpoint(endpoint, chainId);
    results[endpoint] = result;
  }

  return results;
}

