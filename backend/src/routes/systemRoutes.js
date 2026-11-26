const express = require('express');
const { getRoot, getStatus } = require('../controllers/systemController');

const router = express.Router();

router.get('/', getRoot);
router.get('/api/status', getStatus);
router.get('/api/ready', async (req, res) => {
  const { supabaseAdmin } = require('../config/clients');
  if (!supabaseAdmin) {
    const ready = require('../config/env').NODE_ENV !== 'production';
    return res.status(ready ? 200 : 503).json({ ready, storage: 'temporary' });
  }
  try {
    const { error } = await supabaseAdmin.from('meetings').select('id').limit(1).abortSignal(AbortSignal.timeout(3000));
    return res.status(error ? 503 : 200).json({ ready: !error });
  } catch { return res.status(503).json({ ready: false }); }
});

module.exports = router;
