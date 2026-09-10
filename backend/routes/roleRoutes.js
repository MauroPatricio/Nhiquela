import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Role from '../models/roleModel.js';
import AuditLog from '../models/AuditLogModel.js';
import { isAuth, isAdmin, checkPermission } from '../utils.js';

const roleRouter = express.Router();

/**
 * Matriz de Permissões Padrão por Perfil
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: [
    'FULL_ACCESS'
  ],
  OPERATOR: [
    'DASHBOARD_VIEW',
    'DRIVER_VIEW',
    'DRIVER_CREATE',
    'DRIVER_UPDATE',
    'SELLER_VIEW',
    'SELLER_CREATE',
    'SELLER_UPDATE',
    'ORDER_VIEW',
    'ORDER_UPDATE'
  ],
  PARTNER: [
    'DASHBOARD_VIEW',
    'KPI_VIEW',
    'DRIVER_VIEW',
    'DRIVER_CREATE',
    'DRIVER_UPDATE',
    'SELLER_VIEW',
    'ORDER_VIEW',
    'ORDER_CANCEL',
    'REPORT_VIEW',
    'REPORT_EXPORT'
  ],
  SELLER: [
    'DASHBOARD_VIEW',
    'PRODUCT_VIEW',
    'PRODUCT_CREATE',
    'PRODUCT_UPDATE',
    'PRODUCT_DELETE',
    'ORDER_VIEW',
    'ORDER_ACCEPT',
    'ORDER_CANCEL',
    'PROFILE_UPDATE'
  ],
  DRIVER: [
    'TRIP_VIEW',
    'TRIP_ACCEPT',
    'TRIP_UPDATE',
    'TRIP_FINISH',
    'LOCATION_UPDATE',
    'PROFILE_UPDATE'
  ],
  CLIENT: [
    'ORDER_CREATE',
    'ORDER_VIEW',
    'ORDER_CANCEL',
    'SERVICE_REQUEST',
    'PROFILE_UPDATE'
  ]
};

/**
 * POST /api/roles/seed
 * Popula/Garante a existência das 6 roles padrão com suas permissões de fábrica.
 */
roleRouter.post(
  '/seed',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const defaultRoles = [
      { code: 'ADMIN', name: 'Administrador Global', description: 'Acesso ilimitado e controlo total da plataforma', permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN, isSystem: true },
      { code: 'OPERATOR', name: 'Operador de Campo', description: 'Gestão de cadastros e validação operacional de frotas e lojas', permissions: DEFAULT_ROLE_PERMISSIONS.OPERATOR, isSystem: true },
      { code: 'PARTNER', name: 'Parceiro / Gestor de Frota', description: 'Gestão de motoristas e fornecedores associados à carteira', permissions: DEFAULT_ROLE_PERMISSIONS.PARTNER, isSystem: true },
      { code: 'SELLER', name: 'Fornecedor / Estabelecimento', description: 'Gestão de catálogo, produtos físicos/digitais e encomendas', permissions: DEFAULT_ROLE_PERMISSIONS.SELLER, isSystem: true },
      { code: 'DRIVER', name: 'Motorista / Prestador', description: 'Recebimento de viagens, entregas e atualização de GPS', permissions: DEFAULT_ROLE_PERMISSIONS.DRIVER, isSystem: true },
      { code: 'CLIENT', name: 'Cliente Consumidor', description: 'Realização de compras, solicitação de viagens e cotações', permissions: DEFAULT_ROLE_PERMISSIONS.CLIENT, isSystem: true }
    ];

    const results = [];
    for (const rData of defaultRoles) {
      let rDoc = await Role.findOne({ code: rData.code });
      if (!rDoc) {
        rDoc = await Role.create(rData);
      } else {
        // Garantir que as permissões padrão existam se o array estiver vazio
        if (!rDoc.permissions || rDoc.permissions.length === 0) {
          rDoc.permissions = rData.permissions;
          await rDoc.save();
        }
      }
      results.push(rDoc);
    }

    res.send({ message: 'Perfis e permissões padrão inicializados com sucesso.', roles: results });
  })
);

/**
 * GET /api/roles
 * Lista todos os perfis e permissões associadas.
 */
roleRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const roles = await Role.find({}).sort({ isSystem: -1, code: 1 });
    res.send({ roles });
  })
);

/**
 * GET /api/roles/audit-logs
 * Lista o histórico de auditoria de alterações de permissões (Fase 21.10)
 */
roleRouter.get(
  '/audit-logs',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    const logs = await AuditLog.find({})
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const total = await AuditLog.countDocuments({});
    const pages = Math.ceil(total / pageSize);

    res.send({ logs, total, pages, currentPage: page });
  })
);

/**
 * GET /api/roles/:id
 * Obtém detalhes de um perfil específico.
 */
roleRouter.get(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).send({ message: 'Perfil não encontrado.' });
    }
    res.send({ role });
  })
);

/**
 * PUT /api/roles/:id/permissions
 * Altera as permissões atribuídas a uma determinada role e gera um registo de Audit Log (Fase 21.3 & 21.10).
 */
roleRouter.put(
  '/:id/permissions',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).send({ message: 'Perfil não encontrado.' });
    }

    const newPermissions = req.body.permissions;
    if (!Array.isArray(newPermissions)) {
      return res.status(400).send({ message: 'O campo permissions deve ser um array de códigos de ação.' });
    }

    const previousPermissions = [...(role.permissions || [])];

    // Identificar permissões adicionadas e removidas
    const added = newPermissions.filter(p => !previousPermissions.includes(p));
    const removed = previousPermissions.filter(p => !newPermissions.includes(p));

    role.permissions = newPermissions;
    if (req.body.name) role.name = req.body.name;
    if (req.body.description) role.description = req.body.description;
    if (req.body.status) role.status = req.body.status;

    const updatedRole = await role.save();

    // Registar no Audit Log (Fase 21.10)
    try {
      await AuditLog.create({
        performedBy: req.user._id,
        performedByName: req.user.name || req.user.email || 'Admin',
        action: 'ROLE_PERMISSIONS_UPDATE',
        targetRole: role.code,
        details: {
          roleId: role._id,
          roleCode: role.code,
          roleName: role.name,
          addedPermissions: added,
          removedPermissions: removed,
          totalPermissionsCount: newPermissions.length
        },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || ''
      });
    } catch (auditErr) {
      console.error('[Audit Log Creation Error]:', auditErr.message);
    }

    res.send({
      message: `Permissões do perfil '${updatedRole.name}' atualizadas com sucesso.`,
      role: updatedRole,
      audit: { added, removed }
    });
  })
);

/**
 * POST /api/roles
 * Cria um novo papel (role)
 */
roleRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { name, description, permissions } = req.body;
    if (!name) {
      return res.status(400).send({ message: 'Nome da role é obrigatório.' });
    }
    const code = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const existing = await Role.findOne({ code });
    if (existing) {
      return res.status(400).send({ message: 'Já existe um papel com este código ou nome.' });
    }
    const newRole = await Role.create({
      code,
      name,
      description: description || '',
      permissions: Array.isArray(permissions) ? permissions : [],
      isSystem: false
    });
    res.status(201).send({ message: 'Papel criado com sucesso.', role: newRole });
  })
);

/**
 * PUT /api/roles/:id
 * Atualiza um papel existente
 */
roleRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).send({ message: 'Perfil não encontrado.' });
    }
    if (req.body.name && !role.isSystem) {
      role.name = req.body.name;
    }
    if (req.body.description !== undefined) {
      role.description = req.body.description;
    }
    if (Array.isArray(req.body.permissions)) {
      role.permissions = req.body.permissions;
    }
    const updated = await role.save();
    res.send({ message: 'Papel atualizado com sucesso.', role: updated });
  })
);

/**
 * DELETE /api/roles/:id
 * Elimina um papel (não-sistema)
 */
roleRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).send({ message: 'Perfil não encontrado.' });
    }
    if (role.isSystem) {
      return res.status(400).send({ message: 'Papéis protegidos de sistema não podem ser eliminados.' });
    }
    await role.deleteOne();
    res.send({ message: 'Papel eliminado com sucesso.' });
  })
);

export default roleRouter;
