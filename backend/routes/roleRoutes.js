import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Role from '../models/roleModel.js';
import { isAuth, isAdmin } from '../utils.js';

const roleRouter = express.Router();

// Buscar todas as roles
roleRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const roles = await Role.find({});
    res.send(roles);
  })
);

// Criar nova role
roleRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const roleExists = await Role.findOne({ name: req.body.name });
    if (roleExists) {
      return res.status(400).send({ message: 'Já existe uma Role com este nome.' });
    }

    const newRole = new Role({
      name: req.body.name,
      description: req.body.description,
      permissions: req.body.permissions || [],
      isSystem: false,
    });
    const role = await newRole.save();
    res.send({ message: 'Role criada com sucesso', role });
  })
);

// Atualizar role
roleRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (role) {
      if (role.isSystem && req.body.name !== role.name) {
        return res.status(400).send({ message: 'Não pode alterar o nome de uma role protegida.' });
      }
      role.name = req.body.name || role.name;
      role.description = req.body.description || role.description;
      role.permissions = req.body.permissions || role.permissions;
      
      const updatedRole = await role.save();
      res.send({ message: 'Role atualizada com sucesso', role: updatedRole });
    } else {
      res.status(404).send({ message: 'Role não encontrada' });
    }
  })
);

// Eliminar role
roleRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (role) {
      if (role.isSystem) {
        return res.status(400).send({ message: 'Não pode eliminar uma role protegida pelo sistema.' });
      }
      await role.deleteOne();
      res.send({ message: 'Role eliminada com sucesso' });
    } else {
      res.status(404).send({ message: 'Role não encontrada' });
    }
  })
);

export default roleRouter;
