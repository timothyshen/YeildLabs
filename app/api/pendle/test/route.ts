import { NextRequest, NextResponse } from 'next/server';

/**
 * Test Pendle API Endpoints
 * 
 * This route helps us explore the Pendle API structure
 * and find the correct endpoints
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || '/core/v1/markets';
  const chainId = searchParams.get('chainId') || '8453';

  const baseUrl = 'https://api-v2.pendle.finance';
  const url = new URL(endpoint, baseUrl);
  url.searchParams.set('chainId', chainId);

  try {
    console.log(`Testing endpoint: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    const status = response.status;
    const headers = Object.fromEntries(response.headers.entries());
    const body = await response.text();

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = body;
    }

    return NextResponse.json({
      success: status === 200,
      status,
      url: url.toString(),
      headers: {
        'x-ratelimit-limit': headers['x-ratelimit-limit'],
        'x-ratelimit-remaining': headers['x-ratelimit-remaining'],
      },
      response: parsedBody,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: url.toString(),
    }, { status: 500 });
  }
}

