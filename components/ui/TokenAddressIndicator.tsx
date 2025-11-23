'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TokenAddressIndicatorProps {
  address: string;
  symbol?: string;
  className?: string;
}

export function TokenAddressIndicator({ address, symbol, className }: TokenAddressIndicatorProps) {
  const [copied, setCopied] = useState(false);

  // Validate address format
  const isValid = address && 
    address !== '0x' && 
    address !== '0x0000000000000000000000000000000000000000' &&
    address.length === 42 &&
    address.startsWith('0x');

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return 'N/A';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!address) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 cursor-help", className)}>
              <XCircle className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">No Address</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Token address not available</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md cursor-help transition-colors",
              isValid
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800",
              className
            )}
            onClick={handleCopy}
          >
            {isValid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            )}
            <span className={cn(
              "text-xs font-mono",
              isValid
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300"
            )}>
              {formatAddress(address)}
            </span>
            {copied ? (
              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="w-3 h-3 opacity-50" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">Token Address</span>
              {isValid ? (
                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  Valid
                </span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                  Invalid
                </span>
              )}
            </div>
            <div className="font-mono text-xs break-all bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {address}
            </div>
            {symbol && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Symbol: <span className="font-semibold">{symbol}</span>
              </div>
            )}
            <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
              Click to copy address
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

