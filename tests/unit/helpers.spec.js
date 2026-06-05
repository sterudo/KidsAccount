// tests/unit/helpers.spec.js
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate } from '@/utils/helpers';

describe('Utility Math Helpers Unit Test Spec', () => {
  
  describe('formatCurrency()', () => {
    it('Formats positive float point decimals correctly into British Pounds', () => {
      expect(formatCurrency(12.5)).toBe('£12.50');
      expect(formatCurrency(0)).toBe('£0.00');
    });

    it('Gracefully prepends minus signs for negative ledger outputs', () => {
      expect(formatCurrency(-5.75)).toBe('-£5.75');
    });

    it('Safely recovers and maps non-numeric fallback anomalies to clean zeros', () => {
      expect(formatCurrency('corrupted-string')).toBe('£0.00');
      expect(formatCurrency(undefined)).toBe('£0.00');
    });
  });

  describe('formatDate()', () => {
    it('Formats iso date to DD/MM/YYYY', () => {
      const mockDate = "2026-06-04";
      expect(formatDate(mockDate)).toBe('04/06/2026');
    });

    it('Formats iso date time to DD/MM/YYYY', () => {
      expect(formatDate("2026-06-04T12:00:00Z")).toBe('04/06/2026');
    });
  });
});