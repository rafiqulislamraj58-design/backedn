const express = require('express');
const router = express.Router();
const { getLibrarianDeliveries, updateDeliveryStatus } = require('../controllers/deliveryController');

router.get('/librarian', getLibrarianDeliveries);
router.patch('/:id/status', updateDeliveryStatus);

module.exports = router;