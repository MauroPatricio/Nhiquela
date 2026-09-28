import express from 'express';
import * as requestController from '../controllers/ImportRequestController.js';
import * as quotationController from '../controllers/ImportQuotationController.js';
import * as supplierController from '../controllers/InternationalSupplierController.js';
import * as orderController from '../controllers/ImportOrderController.js';
import * as shipmentController from '../controllers/ImportShipmentController.js';
import * as documentController from '../controllers/ImportDocumentController.js';

// Note: Ensure the auth middleware (e.g. isAuth) is applied where needed when integrating with the main Express app.
const router = express.Router();

// --- Requests ---
router.post('/requests', requestController.createRequest);
router.get('/requests', requestController.getRequests);
router.get('/requests/:id', requestController.getRequestById);
router.put('/requests/:id/status', requestController.updateRequestStatus);
router.delete('/requests/:id', requestController.deleteRequest);

// --- Quotations ---
router.post('/quotations', quotationController.createQuotation);
router.get('/quotations/request/:requestId', quotationController.getQuotationByRequestId);
router.put('/quotations/:id', quotationController.updateQuotation);
router.get('/quotations/:id', quotationController.getQuotationById);
router.post('/quotations/:id/send', quotationController.sendQuotation);
router.post('/quotations/:id/accept', quotationController.acceptQuotation);
router.post('/quotations/:id/reject', quotationController.rejectQuotation);

// --- Orders ---
router.get('/orders', orderController.getOrders);
router.get('/orders/:id', orderController.getOrderById);
router.put('/orders/:id/status', orderController.updateOrderStatus);
router.post('/orders/:id/local-delivery', orderController.sendToLocalDelivery);

// --- Shipments ---
router.post('/shipments', shipmentController.createShipment);
router.get('/shipments', shipmentController.getShipments);
router.get('/shipments/:id', shipmentController.getShipmentById);
router.put('/shipments/:id', shipmentController.updateShipment);
router.delete('/shipments/:id', shipmentController.deleteShipment);
router.post('/shipments/:id/orders', shipmentController.addOrderToShipment);

// --- Documents ---
router.post('/documents', documentController.uploadDocument);
router.get('/documents', documentController.getDocuments);
router.get('/documents/order/:orderId', documentController.getDocumentsByOrderId);
router.delete('/documents/:id', documentController.deleteDocument);

// --- International Suppliers ---
router.post('/suppliers', supplierController.createSupplier);
router.get('/suppliers', supplierController.getSuppliers);
router.get('/suppliers/:id', supplierController.getSupplierById);
router.put('/suppliers/:id', supplierController.updateSupplier);
router.delete('/suppliers/:id', supplierController.deleteSupplier);

export default router;
