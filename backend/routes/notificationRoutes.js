import express from 'express';
import User from '../models/UserModel.js';
import { baseUrl, generateToken, isAdmin, isAuth } from '../utils.js';
import expressAsyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import Product from '../models/ProductModel.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer'
import path from 'path'
 

const notificationRoutes = express.Router();


notificationRoutes.post(
  '/',
  // isAuth,
  // isAdmin,
  expressAsyncHandler(async (req, res) => {
    try {
      const { user, tokenID } = req.body;

      const objID = mongoose.Types.ObjectId.isValid(user)
        ? mongoose.Types.ObjectId(user)
        : null;

      if (!objID) {
        return res.status(400).send({ message: 'Invalid User ID' });
      }

      const notification = await Notification.findOne({ user });

      if (notification) {
        return res.status(200).json({
          status: 'success',
          data: {
            message: 'Token already registered!',
          },
        });
      }

      const newNotification = new Notification({
        user: objID,
        tokenID: tokenID,
      });
      await newNotification.save();

      res.status(201).send({
        status: 'success',
        data: newNotification,
      });
    } catch (error) {
      res.status(500).send({ message: 'Server error', error });
    }
  })
);


notificationRoutes.put(
  '/:id',
  expressAsyncHandler(async (req, res) => {
    try {
      const { userid } = req.query;
      
      const objID = mongoose.Types.ObjectId.isValid(userid)
        ? mongoose.Types.ObjectId(userid)
        : null;

      if (!objID) {
        return res.status(400).send({ message: 'Invalid User ID' });
      }

      const notification = await Notification.findOne({ user: objID });

      if (!notification) {
        return res.status(404).send({ message: 'No Document Found' });
      }

      // Update the notification using your factory update function or manual update
      const updatedNotification = await Notification.findByIdAndUpdate(
        notification._id,
        { ...req.body }, // assuming the update data is in the body
        { new: true }
      );

      res.status(200).send({
        status: 'success',
        data: updatedNotification,
      });
    } catch (error) {
      res.status(500).send({ message: 'Server error', error });
    }
  })
);


notificationRoutes.post(
  '/send',
  expressAsyncHandler(async (req, res) => {
    try {
      const { title, body, navigate, tokenID, image, user, data } = req.body;

      // Find notification object for the user
      const notificationObj = await Notification.findOne({ user });

      if (!notificationObj) {
        return res.status(404).send({
          message: 'No Such User with Notifications Object Found',
        });
      }

      // Construct notification object
      const notification = {
        title: title || 'Results Are Ready!',
        body: body || 'Click here to view your results',
        data: {
          navigate: navigate || 'Xray',
          image: image || 'default',
          data: data || null,
        },
        android: {
          smallIcon: 'logo_circle',
          channelId: 'default',
          importance: 4,
          pressAction: {
            id: 'default',
          },
          actions: [
            {
              title: 'Mark as Read',
              pressAction: {
                id: 'read',
              },
            },
          ],
        },
      };

      // Add notification to user's notifications array and save
      notificationObj.notifications.push(notification);
      await notificationObj.save();

      // Send the notification using Firebase Admin SDK
      await admin.messaging().sendMulticast({
        tokens: [tokenID],
        data: {
          notifee: JSON.stringify(notification),
        },
      });

      // Respond with success message
      res.status(200).send({
        message: 'Successfully sent notifications!',
      });
    } catch (error) {
      res.status(500).send({
        message: 'Something went wrong!',
        error: error.message,
      });
    }
  })
);

notificationRoutes.get(
  '/',
  expressAsyncHandler(async (req, res) => {
    try {
      const { user } = req.query;

      // Validate user ID
      const objID = mongoose.Types.ObjectId.isValid(user)
        ? mongoose.Types.ObjectId(user)
        : null;

      if (!objID) {
        return res.status(400).send({ message: 'Invalid User ID' });
      }

      // Find notification object for the user
      const notificationObj = await Notification.findOne({ user: objID });

      if (!notificationObj) {
        return res.status(404).send({
          message: 'No Such User with Notifications Object Found',
        });
      }

      // Send the notification object back in the response
      res.status(200).send({
        status: 'success',
        data: notificationObj,
      });
    } catch (error) {
      res.status(500).send({
        message: 'Something went wrong!',
        error: error.message,
      });
    }
  })
);

export default notificationRoutes;
