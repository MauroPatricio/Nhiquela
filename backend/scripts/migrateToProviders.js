import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/UserModel.js';
import Provider from '../models/ProviderModel.js';
import Product from '../models/ProductModel.js';
import Order from '../models/OrderModel.js';
import RequestService from '../models/RequestServiceModel.js';
import ServiceRequest from '../models/ServiceRequestModel.js';

dotenv.config();

const migrateData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/nhiquela');
    console.log('Connected to MongoDB. Starting migration...');

    // 1. Migrate Sellers (BUSINESS)
    const sellers = await User.find({ isSeller: true });
    let businessCount = 0;
    let productsUpdatedCount = 0;
    let ordersSellerUpdatedCount = 0;
    
    for (const user of sellers) {
      if (user.seller && user.seller.name) {
        // Check if provider already exists for this user to avoid duplicates
        let provider = await Provider.findOne({ ownerId: user._id, providerType: 'BUSINESS' });
        if (!provider) {
          provider = new Provider({
            name: user.seller.name,
            providerType: 'BUSINESS',
            categoryId: user.seller.tipoEstabelecimento, // EstablishmentType
            ownerId: user._id,
            location: {
              address: user.seller.address,
              lat: user.seller.latitude ? parseFloat(user.seller.latitude) : null,
              lng: user.seller.longitude ? parseFloat(user.seller.longitude) : null,
              province: user.seller.province
            },
            rating: user.seller.rating || 0,
            numReviews: user.seller.numReviews || 0,
            status: user.isApproved ? 'active' : (user.isBanned ? 'suspended' : 'inactive'),
            verificationStatus: user.isApproved ? 'approved' : 'pending',
            businessData: {
              logo: user.seller.logo,
              description: user.seller.description,
              openTime: user.seller.opentime,
              closeTime: user.seller.closetime,
              isOpen: user.seller.openstore,
              phoneNumberAccount: user.seller.phoneNumberAccount,
              alternativePhoneNumberAccount: user.seller.alternativePhoneNumberAccount,
              accountType: user.seller.accountType,
              accountNumber: user.seller.accountNumber,
              alternativeAccountType: user.seller.alternativeAccountType,
              alternativeAccountNumber: user.seller.alternativeAccountNumber,
              workDayAndTime: user.seller.workDayAndTime
            }
          });
          await provider.save();
          businessCount++;
        }

        const providerId = provider._id;

        // Update Products
        const prodRes = await Product.updateMany({ seller: user._id }, { seller: providerId });
        productsUpdatedCount += prodRes.modifiedCount;

        // Update Orders (sellers array field)
        const orderRes = await Order.updateMany(
          { sellers: user._id },
          { $set: { "sellers.$[elem]": providerId } },
          { arrayFilters: [{ elem: user._id }] }
        );
        ordersSellerUpdatedCount += orderRes.modifiedCount;
      }
    }
    console.log(`Migrated ${businessCount} Sellers to BUSINESS Providers.`);
    console.log(`Updated ${productsUpdatedCount} Products and ${ordersSellerUpdatedCount} Orders for BUSINESS Providers.`);

    // 2. Migrate Deliverymen (SERVICE)
    const deliverymen = await User.find({ isDeliveryMan: true });
    let serviceCount = 0;
    let ordersDeliverymanUpdatedCount = 0;
    let requestServiceUpdatedCount = 0;
    let serviceRequestUpdatedCount = 0;

    for (const user of deliverymen) {
      if (user.deliveryman && user.deliveryman.name) {
        let provider = await Provider.findOne({ ownerId: user._id, providerType: 'SERVICE' });
        if (!provider) {
          provider = new Provider({
            name: user.deliveryman.name,
            providerType: 'SERVICE',
            ownerId: user._id,
            location: {
              lat: user.latitude ? parseFloat(user.latitude) : null,
              lng: user.longitude ? parseFloat(user.longitude) : null,
            },
            status: user.isApproved ? 'active' : (user.isBanned ? 'suspended' : 'inactive'),
            verificationStatus: user.isApproved ? 'approved' : 'pending',
            serviceData: {
              photo: user.deliveryman.photo,
              phoneNumber: user.deliveryman.phoneNumber,
              transport_type: user.deliveryman.transport_type,
              transport_color: user.deliveryman.transport_color,
              transport_registration: user.deliveryman.transport_registration,
              vehicle_type_id: user.deliveryman.vehicle_type_id,
              assigned_base_fee: user.deliveryman.assigned_base_fee,
              vihicle_picture: user.deliveryman.vihicle_picture,
              vihicle_inspection: user.deliveryman.vihicle_inspection,
              vihicle_Insurance: user.deliveryman.vihicle_Insurance,
              license_front: user.deliveryman.license_front,
              license_back: user.deliveryman.license_back,
              document_type: user.deliveryman.document_type,
              document_front: user.deliveryman.document_front,
              document_back: user.deliveryman.document_back,
              Proof_of_Address: user.deliveryman.Proof_of_Address,
              Proof_of_Addres_Reason: user.deliveryman.Proof_of_Addres_Reason,
              register_conformance: user.deliveryman.register_conformance,
              providedServices: user.deliveryman.providedServices
            }
          });
          await provider.save();
          serviceCount++;
        }

        const providerId = provider._id;

        // Update Orders
        const ordRes = await Order.updateMany(
          { "deliveryman.id": user._id },
          { $set: { "deliveryman.id": providerId } }
        );
        ordersDeliverymanUpdatedCount += ordRes.modifiedCount;

        // Update RequestService
        const reqDelRes = await RequestService.updateMany(
          { "deliveryman.id": user._id },
          { $set: { "deliveryman.id": providerId } }
        );
        requestServiceUpdatedCount += reqDelRes.modifiedCount;

        // Update ServiceRequests
        const srvReqRes = await ServiceRequest.updateMany(
          { providerId: user._id },
          { $set: { providerId: providerId } }
        );
        serviceRequestUpdatedCount += srvReqRes.modifiedCount;
      }
    }
    console.log(`Migrated ${serviceCount} Deliverymen to SERVICE Providers.`);
    console.log(`Updated ${ordersDeliverymanUpdatedCount} Orders, ${requestServiceUpdatedCount} RequestServices, and ${serviceRequestUpdatedCount} ServiceRequests for SERVICE Providers.`);

    console.log('Migration complete successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateData();
