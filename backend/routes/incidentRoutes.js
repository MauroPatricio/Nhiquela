import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Incident from '../models/IncidentModel.js';
import { isAuth, isAdmin } from '../utils.js';

const incidentRouter = express.Router();

incidentRouter.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    const incidents = await Incident.find().populate('reportedBy', 'name email').populate('order', 'totalPrice createdAt');
    res.send(incidents);
  })
);

incidentRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const newIncident = new Incident({
      title: req.body.title,
      description: req.body.description,
      reportedBy: req.user._id,
      order: req.body.order || null,
    });
    const createdIncident = await newIncident.save();
    res.status(201).send({ message: 'Incidente reportado', incident: createdIncident });
  })
);

incidentRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const incident = await Incident.findById(req.params.id);
    if (incident) {
      incident.status = req.body.status || incident.status;
      incident.resolutionNotes = req.body.resolutionNotes || incident.resolutionNotes;
      const updatedIncident = await incident.save();
      res.send({ message: 'Incidente atualizado', incident: updatedIncident });
    } else {
      res.status(404).send({ message: 'Incidente não encontrado' });
    }
  })
);

incidentRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const incident = await Incident.findById(req.params.id);
    if (incident) {
      await incident.deleteOne();
      res.send({ message: 'Incidente apagado' });
    } else {
      res.status(404).send({ message: 'Incidente não encontrado' });
    }
  })
);

export default incidentRouter;
