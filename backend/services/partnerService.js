// services/partnerService.js
import Partner from '../models/PartnerModel.js';
import PartnerProduct from '../models/PartnerProductModel.js';
import Product from '../models/ProductModel.js';

// Helper to calculate commission (placeholder, can be enhanced)
const calculateCommission = (price, quantity, rate = 0.1) => {
  return price * quantity * rate;
};

/** Create a new partner */
export const createPartner = async (data) => {
  const partner = new Partner(data);
  return await partner.save();
};

/** List partners: admin sees all, partner sees self */
export const listPartners = async (user) => {
  if (user && user.isAdmin) {
    return await Partner.find();
  }
  // Assuming partner users have a reference to their partner record via user.partnerId
  if (user && user.partnerId) {
    return [await Partner.findById(user.partnerId)];
  }
  return [];
};

/** Get partner by id */
export const getPartner = async (partnerId) => {
  return await Partner.findById(partnerId);
};

/** Update partner (admin or owner) */
export const updatePartner = async (partnerId, updates, user) => {
  if (user && (user.isAdmin || (user.partnerId && user.partnerId.toString() === partnerId))) {
    return await Partner.findByIdAndUpdate(partnerId, updates, { new: true });
  }
  return null;
};

/** Deactivate (soft‑delete) a partner */
export const deletePartner = async (partnerId) => {
  return await Partner.findByIdAndUpdate(partnerId, { isActive: false }, { new: true });
};

/** Add a product to a partner catalog */
export const addPartnerProduct = async (partnerId, data) => {
  // Validate partner exists
  const partner = await Partner.findById(partnerId);
  if (!partner) throw new Error('Partner not found');

  // Ensure the underlying product exists (optional but recommended)
  if (data.product) {
    const prod = await Product.findById(data.product);
    if (!prod) throw new Error('Base product not found');
  }

  const partnerProduct = new PartnerProduct({ partner: partnerId, ...data });
  return await partnerProduct.save();
};

/** Search partner products with simple filters */
export const searchPartnerProducts = async (partnerId, filters = {}) => {
  const query = { partner: partnerId, ...filters };
  return await PartnerProduct.find(query);
};

/** Update a partner product */
export const updatePartnerProduct = async (partnerId, productId, updates) => {
  const pp = await PartnerProduct.findOne({ _id: productId, partner: partnerId });
  if (!pp) throw new Error('Partner product not found');
  Object.assign(pp, updates);
  return await pp.save();
};

/** Remove a partner product (soft delete) */
export const removePartnerProduct = async (partnerId, productId) => {
  return await PartnerProduct.findOneAndUpdate(
    { _id: productId, partner: partnerId },
    { isActive: false },
    { new: true }
  );
};

/** Export all functions as a default object for easy import */
export default {
  createPartner,
  listPartners,
  getPartner,
  updatePartner,
  deletePartner,
  addPartnerProduct,
  searchPartnerProducts,
  updatePartnerProduct,
  removePartnerProduct,
  calculateCommission,
};
