'use client';

import React from 'react';

interface TransactionStatusProps {
  isMintSuccess: boolean;
  isRedeemSuccess: boolean;
  mintHash?: string;
  redeemHash?: string;
  mintError?: Error | null;
  redeemError?: Error | null;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = React.memo(({
  isMintSuccess,
  isRedeemSuccess,
  mintHash,
  redeemHash,
  mintError,
  redeemError,
}) => {
  return (
    <>
      {isMintSuccess && mintHash && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">
            Strategy executed!{' '}
            <a
              href={`https://basescan.org/tx/${mintHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View Transaction
            </a>
          </p>
        </div>
      )}

      {isRedeemSuccess && redeemHash && (
        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">
            Redeem successful!{' '}
            <a
              href={`https://basescan.org/tx/${redeemHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View Transaction
            </a>
          </p>
        </div>
      )}

      {mintError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            Error: {mintError.message}
          </p>
        </div>
      )}

      {redeemError && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            Redeem Error: {redeemError.message}
          </p>
        </div>
      )}
    </>
  );
});

TransactionStatus.displayName = 'TransactionStatus';
