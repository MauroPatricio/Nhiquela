// tests/reputationTracker.test.js
// Pure UNIT tests for the reputation tracker - no DB connection needed.
// MongoDB models (User, DocumentOrder) are fully mocked via Jest.

import { jest, beforeEach, test, expect, describe } from '@jest/globals';

// -- Mock models BEFORE importing the module under test --
const mockFindByIdAndUpdate = jest.fn();
const mockFindById = jest.fn();
const mockCountDocuments = jest.fn();

jest.unstable_mockModule('../models/UserModel.js', () => ({
  default: {
    findByIdAndUpdate: mockFindByIdAndUpdate,
    findById: mockFindById,
  },
}));

jest.unstable_mockModule('../models/DocumentOrder.js', () => ({
  default: {
    countDocuments: mockCountDocuments,
  },
}));

// Dynamic import AFTER mocks are registered
const { default: reputationTracker } = await import('../utils/reputationTracker.js');

beforeEach(() => {
  mockFindByIdAndUpdate.mockReset();
  mockFindById.mockReset();
  mockCountDocuments.mockReset();
});

describe('reputationTracker', () => {
  describe('recordOrderCreated()', () => {
    test('calls findByIdAndUpdate with $inc totalOrders', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({});
      await reputationTracker.recordOrderCreated('user123');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('user123', { $inc: { totalOrders: 1 } });
    });

    test('handles DB errors gracefully without throwing', async () => {
      mockFindByIdAndUpdate.mockRejectedValue(new Error('DB error'));
      await expect(reputationTracker.recordOrderCreated('user123')).resolves.not.toThrow();
    });
  });

  describe('recordOrderCompleted()', () => {
    test('increments completedOrders and triggers rating update', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({});
      mockFindById.mockResolvedValue({
        completedOrders: 1,
        cancelledOrders: 0,
        totalOrders: 1,
      });
      await reputationTracker.recordOrderCompleted('user123');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('user123', { $inc: { completedOrders: 1 }, $set: { consecutiveCancellations: 0 } });
    });
  });

  describe('recordOrderCancelled()', () => {
    test('increments cancelledOrders and triggers rating update', async () => {
      mockFindByIdAndUpdate.mockResolvedValue({});
      mockFindById.mockResolvedValue({
        completedOrders: 0,
        cancelledOrders: 1,
        totalOrders: 1,
      });
      await reputationTracker.recordOrderCancelled('user123');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('user123', { $inc: { cancelledOrders: 1, consecutiveCancellations: 1 } }, { new: true });
    });
  });

  describe('updateUserRating()', () => {
    test('sets rating to Excelente when no cancellations and has completed orders', async () => {
      mockFindById.mockResolvedValue({ completedOrders: 5, cancelledOrders: 0, totalOrders: 5 });
      mockFindByIdAndUpdate.mockResolvedValue({});
      await reputationTracker.updateUserRating('user123');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('user123', { rating: 'Excelente' });
    });

    test('sets rating to Bom when completed orders outnumber cancellations', async () => {
      mockFindById.mockResolvedValue({ completedOrders: 3, cancelledOrders: 1, totalOrders: 4 });
      mockFindByIdAndUpdate.mockResolvedValue({});
      await reputationTracker.updateUserRating('user123');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('user123', { rating: 'Bom' });
    });

    test('sets rating to Regular when cancellations equal or exceed completed orders', async () => {
      mockFindById.mockResolvedValue({ completedOrders: 1, cancelledOrders: 1, totalOrders: 2 });
      mockFindByIdAndUpdate.mockResolvedValue({});
      await reputationTracker.updateUserRating('user123');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('user123', { rating: 'Regular' });
    });

    test('sets rating to Alto indice when cancellations exceed completed orders', async () => {
      mockFindById.mockResolvedValue({ completedOrders: 1, cancelledOrders: 5, totalOrders: 6 });
      mockFindByIdAndUpdate.mockResolvedValue({});
      await reputationTracker.updateUserRating('user123');
      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('user123', { rating: 'Alto índice de cancelamento' });
    });
  });

  describe('getMetrics()', () => {
    test('returns correct aggregation values', async () => {
      mockCountDocuments
        .mockResolvedValueOnce(5)   // total
        .mockResolvedValueOnce(3)   // paid (completed)
        .mockResolvedValueOnce(2);  // cancelled

      const metrics = await reputationTracker.getMetrics('user123');

      expect(metrics.totalOrders).toBe(5);
      expect(metrics.completedOrders).toBe(3);
      expect(metrics.cancelledOrders).toBe(2);
      expect(metrics.completionRate).toBe(60);
      expect(metrics.cancellationRate).toBe(40);
    });

    test('returns zero rates when no orders exist', async () => {
      mockCountDocuments.mockResolvedValue(0);
      const metrics = await reputationTracker.getMetrics('user123');
      expect(metrics.completionRate).toBe(0);
      expect(metrics.cancellationRate).toBe(0);
    });
  });
});
