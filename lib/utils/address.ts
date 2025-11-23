/**
 * Address Utility Functions
 *
 * Centralized utilities for handling blockchain addresses
 */

/**
 * Normalize address by removing chainId prefix if present
 *
 * Some APIs return addresses in format "chainId-0xAddress"
 * This function extracts just the address part
 *
 * @param addr - Address string, possibly with chainId prefix
 * @returns Normalized address without prefix
 *
 * @example
 * normalizeAddress("8453-0x123...") // "0x123..."
 * normalizeAddress("0x123...") // "0x123..."
 */
export function normalizeAddress(addr: string): string {
  if (!addr) return '';

  // If address contains hyphen, it's likely in chainId-address format
  if (addr.includes('-')) {
    const parts = addr.split('-');
    // Return the last part (the actual address)
    return parts[parts.length - 1] || addr;
  }

  return addr;
}

/**
 * Check if a string is a valid Ethereum address
 *
 * @param address - String to validate
 * @returns True if valid Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  if (!address) return false;

  // Basic validation: starts with 0x and is 42 characters
  const normalized = normalizeAddress(address);
  return /^0x[a-fA-F0-9]{40}$/.test(normalized);
}

/**
 * Truncate address for display
 *
 * @param address - Full address
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Truncated address like "0x1234...5678"
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address) return '';

  const normalized = normalizeAddress(address);

  if (normalized.length <= startChars + endChars) {
    return normalized;
  }

  return `${normalized.slice(0, startChars)}...${normalized.slice(-endChars)}`;
}

/**
 * Compare two addresses for equality (case-insensitive)
 *
 * @param addr1 - First address
 * @param addr2 - Second address
 * @returns True if addresses are equal
 */
export function addressesEqual(addr1: string, addr2: string): boolean {
  if (!addr1 || !addr2) return false;

  const normalized1 = normalizeAddress(addr1).toLowerCase();
  const normalized2 = normalizeAddress(addr2).toLowerCase();

  return normalized1 === normalized2;
}
