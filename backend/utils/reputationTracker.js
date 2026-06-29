// utils/reputationTracker.js
// Simple reputation tracking helpers. In a real system you might store aggregates on the User model.
// Here we just compute on‑the‑fly from DocumentOrder collection.

import DocumentOrder from '../models/DocumentOrder.js';
import User from '../models/UserModel.js'; // Assuming existing User model

const recordOrderCreated = async (userId) => {
  // Increment totalOrders when an order is initially created
  try {
    await User.findByIdAndUpdate(userId, { $inc: { totalOrders: 1 } });
  } catch (err) {
    console.error('Failed to record order creation:', err);
  }
};

// Increment completedOrders when an order reaches completed status
const recordOrderCompleted = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { $inc: { completedOrders: 1 } });
    await updateUserRating(userId);
  } catch (err) {
    console.error('Failed to record order completion:', err);
  }
};

const recordOrderCancelled = async (userId) => {
  // Increment cancelledOrders counter
  try {
    await User.findByIdAndUpdate(userId, { $inc: { cancelledOrders: 1 } });
    // Recalculate rating based on new counters
    await updateUserRating(userId);
  } catch (err) {
    console.error('Failed to record order cancellation:', err);
  }
};

const recordValidation = async (validatorId) => {
  // No reputation impact for validators in current design
};

const getMetrics = async (userId) => {
  const total = await DocumentOrder.countDocuments({ user: userId });
  const completed = await DocumentOrder.countDocuments({ user: userId, status: 'paid' });
  const cancelled = await DocumentOrder.countDocuments({ user: userId, status: 'cancelled' });
  const completionRate = total ? (completed / total) * 100 : 0;
  const cancellationRate = total ? (cancelled / total) * 100 : 0;
  return {
    totalOrders: total,
    completedOrders: completed,
    cancelledOrders: cancelled,
    completionRate: Math.round(completionRate),
    cancellationRate: Math.round(cancellationRate),
    rating: cancelled > completed ? 'Alto índice de cancelamento' : cancelled > 0 ? 'Regular' : completed > 0 ? 'Bom' : 'Excelente',
  };
};

// Helper to update rating field based on counters
const updateUserRating = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    const { totalOrders, completedOrders, cancelledOrders } = user;
    let rating = 'Excelente';
    if (cancelledOrders > completedOrders) rating = 'Alto índice de cancelamento';
    else if (cancelledOrders > 0 && completedOrders <= cancelledOrders) rating = 'Regular';
    else if (cancelledOrders > 0 && completedOrders > cancelledOrders) rating = 'Bom';
    else if (cancelledOrders === 0 && completedOrders > 0) rating = 'Excelente';
    await User.findByIdAndUpdate(userId, { rating });
  } catch (err) {
    console.error('Failed to update user rating:', err);
  }
};

export default {
  recordOrderCreated,
  recordOrderCancelled,
  recordOrderCompleted,
  recordValidation,
  getMetrics,
  updateUserRating,
};
