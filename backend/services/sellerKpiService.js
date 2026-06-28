// services/sellerKpiService.js
// Provides KPI data for sellers (formerly partners) such as top-selling products.

import mongoose from 'mongoose';
import Order from '../models/OrderModel.js';
import Product from '../models/ProductModel.js';

/**
 * Get the top‑selling products for a given seller.
 * @param {string} sellerId - MongoDB ObjectId string of the seller.
 * @param {number} limit - Number of top products to return (default 10).
 * @returns {Promise<Array>} Array of product KPI objects:
 *   { productId, name, totalQuantitySold }
 */
export const getTopSellingProducts = async (sellerId, limit = 10) => {
  if (!mongoose.Types.ObjectId.isValid(sellerId)) {
    throw new Error('Invalid sellerId');
  }

  const agg = await Order.aggregate([
    { $match: { seller: mongoose.Types.ObjectId(sellerId) } },
    { $unwind: '$orderItems' },
    {
      $group: {
        _id: '$orderItems.product',
        totalQuantitySold: { $sum: { $toInt: '$orderItems.quantity' } },
      },
    },
    { $sort: { totalQuantitySold: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products', // collection name
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo',
      },
    },
    { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        productId: '$_id',
        name: '$productInfo.name',
        totalQuantitySold: 1,
      },
    },
  ]);

  return agg;
};

export default { getTopSellingProducts };
