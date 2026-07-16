const express = require("express")
const iliyanApiTestController = require("../controllers/iliyanApiTestController")

const router = new express.Router()

// GET /api/iliyanApiTest?address=0x... (address optional, defaults to USDT)
router.get("/", iliyanApiTestController.getContractInfo)

module.exports = router
