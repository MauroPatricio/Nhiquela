// tests/feeCalculator.test.js
// Pure UNIT tests for the fee calculator - no DB connection needed.
// MongoDB models are fully mocked via Jest.

import { jest, beforeEach, afterEach, test, expect, describe } from '@jest/globals';

// -- Mock the ProcessingFee model BEFORE importing the module under test --
const mockFindOne = jest.fn();
jest.unstable_mockModule('../models/ProcessingFee.js', () => ({
  default: { findOne: mockFindOne },
}));

// Dynamic import AFTER mock is registered
const { default: feeCalculator } = await import('../utils/feeCalculator.js');

beforeEach(() => {
  mockFindOne.mockReset();
});

describe('feeCalculator.calculateProcessingFee()', () => {
  test('returns base fee when no establishment override exists', async () => {
    mockFindOne
      .mockResolvedValueOnce({ amount: 5, exempt: false })  // base fee
      .mockResolvedValueOnce(null);                          // no est. override

    const fee = await feeCalculator.calculateProcessingFee({
      serviceType: 'document',
      establishment: null,
    });

    expect(fee).toBe(5);
  });

  test('uses establishment-specific fee over base fee when both exist', async () => {
    mockFindOne
      .mockResolvedValueOnce({ amount: 5, exempt: false })  // base fee
      .mockResolvedValueOnce({ amount: 8, exempt: false }); // est. override

    const fee = await feeCalculator.calculateProcessingFee({
      serviceType: 'document',
      establishment: 'est123',
    });

    expect(fee).toBe(8);
  });

  test('calculates percentage fee correctly when amount is not set', async () => {
    mockFindOne
      .mockResolvedValueOnce({ percentage: 10, exempt: false }) // base fee
      .mockResolvedValueOnce(null);                              // no est. override

    const fee = await feeCalculator.calculateProcessingFee({
      serviceType: 'document',
      cartTotal: 100,
    });

    expect(fee).toBe(10); // 10% of 100
  });

  test('returns 0 for exempt fee regardless of amount', async () => {
    mockFindOne
      .mockResolvedValueOnce({ amount: 20, exempt: true }) // exempt base fee
      .mockResolvedValueOnce(null);

    const fee = await feeCalculator.calculateProcessingFee({
      serviceType: 'document',
    });

    expect(fee).toBe(0);
  });

  test('returns 0 when no fee configuration exists for the service type', async () => {
    mockFindOne.mockResolvedValue(null); // no fee in DB at all

    const fee = await feeCalculator.calculateProcessingFee({
      serviceType: 'nonexistent_type',
    });

    expect(fee).toBe(0);
  });

  test('returns 0 when fee has percentage but no cartTotal provided', async () => {
    mockFindOne
      .mockResolvedValueOnce({ percentage: 15, exempt: false })
      .mockResolvedValueOnce(null);

    const fee = await feeCalculator.calculateProcessingFee({
      serviceType: 'delivery',
      // cartTotal intentionally omitted
    });

    expect(fee).toBe(0);
  });
});
