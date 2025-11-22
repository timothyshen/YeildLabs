'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

export default function PendleExplorerPage() {
  const [endpoint, setEndpoint] = useState('markets');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testEndpoint = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(
        `/api/pendle/explore?endpoint=${endpoint}&chainId=8453`
      );
      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Failed to explore endpoint');
        setResults(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testAll = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/pendle/explore?all=true&chainId=8453');
      const data = await response.json();

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'Failed to explore endpoints');
        setResults(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Pendle API Explorer"
          subtitle="Discover correct API endpoint paths"
          showNavigation={false}
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Test Endpoints
          </h2>

          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="markets, pools, tokens..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={testEndpoint}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Test Endpoint
            </button>
            <button
              onClick={testAll}
              disabled={isLoading}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Test All
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Try endpoints like: markets, pools, tokens, yields, positions
          </p>
        </div>

        {isLoading && <LoadingState message="Testing endpoints..." />}

        {error && (
          <ErrorState
            title="Exploration Error"
            message={error}
          />
        )}

        {results && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Results
            </h3>

            {results.workingPath && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                  ✅ Working Endpoint Found!
                </p>
                <p className="font-mono text-green-900 dark:text-green-100">
                  {results.workingPath}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Test Results:
              </h4>
              {results.results?.map((result: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-gray-900 dark:text-white">
                      {result.path}
                    </code>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        result.success
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-400 text-white'
                      }`}
                    >
                      {result.status || 'Error'}
                    </span>
                  </div>
                  {result.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {result.error.substring(0, 100)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {results.sampleResponse && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Sample Response:
                </h4>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(results.sampleResponse, null, 2).substring(0, 1000)}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
            💡 How to Use
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Enter an endpoint name (e.g., "markets") and click "Test Endpoint"</li>
            <li>Or click "Test All" to test common endpoints</li>
            <li>Green results indicate working endpoints</li>
            <li>Once you find a working endpoint, update the config file</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

