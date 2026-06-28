// Migration script to create indexes for Partner and PartnerProduct collections
// Run with a MongoDB client to ensure proper indexing.

module.exports = async function (db) {
  // Partner collection indexes
  await db.collection('partners').createIndex({ email: 1 }, { unique: true });
  await db.collection('partners').createIndex({ name: 1 });

  // PartnerProduct collection indexes
  await db.collection('partnerproducts').createIndex({ partner: 1 });
  await db.collection('partnerproducts').createIndex({ price: 1 });
  await db.collection('partnerproducts').createIndex({ stock: 1 });

  console.log('Indexes for Partner and PartnerProduct created');
};
