const express = require('express');
const { runIndicatorById } = require('../services/indicatorExecutionService');
const { logInfo } = require('../services/logger');

const router = express.Router();

router.post('/:id/run', async (req, res) => {
  try {
    const { candles, settings } = req.body || {};
    if (!Array.isArray(candles) || candles.length === 0) {
      return res.status(400).json({ error: { type: 'InputError', message: 'candles array is required' } });
    }
    logInfo('indicatorExecutionRoutes: /:id/run called', {
      module: 'indicatorExecutionRoute',
      id: req.params.id,
      candles: candles.length,
    });
    const result = await runIndicatorById(req.params.id, candles, { settings });
    if (!result.ok) {
      const error = result.error || { type: 'IndicatorError', message: 'indicator execution failed' };
      const status = error.type === 'NotFound' ? 404 : error.type === 'InputError' ? 400 : 500;
      return res.status(status).json({ error });
    }
    const response = {
      series: result.series.main || [],
      overlay: {
        series: result.series,
        markers: result.markers || [],
        levels: result.levels || [],
        plots: result.plots || [],
      },
      meta: result.meta || {},
    };
    return res.json(response);
  } catch (error) {
    // Fallback error handler
    // eslint-disable-next-line no-console
    console.error('[indicatorExecutionRoutes] unexpected error', error);
    return res.status(500).json({
      error: {
        type: 'ServerError',
        message: 'unexpected error while running indicator',
      },
    });
  }
});

module.exports = router;
