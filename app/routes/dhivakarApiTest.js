const express = require('express');
const dhivakarApiTestController = require('../controllers/dhivakarApiTestController');

const router = new express.Router();

// GET /dhivakarApiTest?address=0x... (address optional, defaults to USDT)
router.get('/', dhivakarApiTestController.getContractInfo);

module.exports = router;