const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Order = require("../models/order");
const handleError = require("../middleware/handleError");
const shippingRequest = require("../middleware/shippingRequest");
const requestUserData = require("../middleware/requestUserData");
const invoicingRequest = require("../middleware/invoicingRequest");
const decreaseStockCount = require("../middleware/decreaseStockCount");
const jwt = require('jsonwebtoken');

//eventlistener for GET requests
router.get("/", (req, res, next) => {
  Order.find()
    .exec()
    .then(documents => {
      res.status(200).json(documents);
    })
    .catch(error => handleError(error));
});

//eventlistener for GET requests med ID
router.get("/:id", (req, res, next) => {
  const id = req.params.id;

  Order.findById(id)
    .exec()
    .then(document => {
      res.status(200).json(document);
    })
    .catch(error => handleError(error));
});
router.get("/user/:userId", (req, res, next) => {
  const id = req.params.userId;

  Order.find({userId: id})
    .exec()
    .then(document => {
      res.status(200).json(document);
    })
    .catch(error => handleError(error));
});
router.get("/user/:userId/:id", (req, res, next) => {
  const id = req.params.id;
  const userId = req.params.userId;

  Order.find({_id: id, userId: userId})
    .exec()
    .then(document => {
      res.status(200).json(document);
    })
    .catch(error => handleError(error));
});

//eventlistener for POST requests
router.post("/", async (req, res, next) => {
  const {
    userId,
    productId,
    productSku,
    productName,
    productSize,
    productPrice,
    productQuantity,
    warehouse,
    shipping
  } = req.body;
  
  //Jwt
  const userAuth = req.header('authorization');
  console.log(userAuth);

  // få ut info om användaren baserat på userId som fås 
  // i post req från frontend med userId och produktinfo för beställningen
  const time = new Date();
  
  const userInfo = await requestUserData(userId, userAuth);
  
  console.log("USERINFO");
  console.log(userInfo);
  
  const {firstName, lastName, email, address, town, state, phoneNumber, zipCode} = userInfo 

  const order = new Order({
    _id: time.getTime(),
    userId,
    firstName,
    lastName,
    email,
    address,
    town,
    state,
    date: time,
    phoneNumber,
    zipCode,
    productId,
    productSku,
    productName,
    productSize,
    productPrice,
    productQuantity,
    warehouse,
    shipping
  });

  order
    .save()
    .then(result => {
      console.log(result);
      res.status(201).json({
        message: "Order successfully created!",
        order: order
      });
      /*
        SKICKAR REQUESTS TILL SHIPPING OCH INVOICING API MED 
        INKOMMANDE POST REQUESTS (ORDERS)
      */
      shippingRequest(result)
      invoicingRequest(result)
      decreaseStockCount(result)  

    })
    .catch(error => handleError(error));
});

//eventlistener for DELETE requests
router.delete("/:id", async (req, res, next) => {
  const reply = await Order.findById(req.params.id);
  if (reply.owner != req.user) {
    res.status(401).json({
      message: "Authentication failed"
    });
  } else {
    Order.remove({ _id: req.params.id })
      .exec()
      .then(result => {
        res.status(200).json({
          message: "Order deleted"
        });
      })
      .catch(error => handleError(error));
  }
});


router.use((req, res, next) => {
  const error = new Error("Only GET, POST, DELETE commands supported");
  error.status = 500;
  next(error);
});

module.exports = router;
