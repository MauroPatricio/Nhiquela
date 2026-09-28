import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import PaymentAccount from '../models/PaymentAccountModel.js';
import { isAuth, isAdmin } from '../utils.js';

const paymentAccountRouter = express.Router();

// GET all active accounts (accessible to all, used by client apps)
paymentAccountRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const accounts = await PaymentAccount.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
    res.send(accounts);
  })
);

// GET all accounts including inactive (admin only)
paymentAccountRouter.get(
  '/all',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const accounts = await PaymentAccount.find().sort({ displayOrder: 1, createdAt: 1 });
    res.send(accounts);
  })
);

// POST create a new account (admin only)
paymentAccountRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const account = new PaymentAccount({
      name: req.body.name,
      type: req.body.type,
      accountNumber: req.body.accountNumber,
      accountName: req.body.accountName,
      bankName: req.body.bankName,
      iban: req.body.iban,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      notes: req.body.notes,
      icon: req.body.icon,
      displayOrder: req.body.displayOrder || 0,
    });
    const created = await account.save();
    res.status(201).send({ message: 'Conta de pagamento criada', account: created });
  })
);

// PUT update an account (admin only)
paymentAccountRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const account = await PaymentAccount.findById(req.params.id);
    if (!account) return res.status(404).send({ message: 'Conta não encontrada' });

    account.name = req.body.name ?? account.name;
    account.type = req.body.type ?? account.type;
    account.accountNumber = req.body.accountNumber ?? account.accountNumber;
    account.accountName = req.body.accountName ?? account.accountName;
    account.bankName = req.body.bankName ?? account.bankName;
    account.iban = req.body.iban ?? account.iban;
    account.isActive = req.body.isActive !== undefined ? req.body.isActive : account.isActive;
    account.notes = req.body.notes ?? account.notes;
    account.icon = req.body.icon ?? account.icon;
    account.displayOrder = req.body.displayOrder ?? account.displayOrder;

    const updated = await account.save();
    res.send({ message: 'Conta actualizada', account: updated });
  })
);

// DELETE an account (admin only)
paymentAccountRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const account = await PaymentAccount.findById(req.params.id);
    if (!account) return res.status(404).send({ message: 'Conta não encontrada' });
    await account.deleteOne();
    res.send({ message: 'Conta eliminada' });
  })
);

export default paymentAccountRouter;
