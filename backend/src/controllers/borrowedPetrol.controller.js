const service = require('../services/borrowedPetrol.service');

async function list(req, res, next) {
  try {
    const rows = await service.list({ status: req.query.status });
    res.json({ success: true, count: rows.length, records: rows });
  } catch (err) {
    next(err);
  }
}

async function pending(req, res, next) {
  try {
    const rows = await service.listPending();
    res.json({ success: true, count: rows.length, records: rows });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const record = await service.getById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const record = await service.create(req.body, req.user.id);
    res.status(201).json({ success: true, record });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const record = await service.update(id, req.body);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
}

/** POST /api/borrowed-petrol/:id/payment   Body: { amount: number } */
async function addPayment(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const record = await service.addPayment(id, req.body.amount);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, pending, getOne, create, update, addPayment };
