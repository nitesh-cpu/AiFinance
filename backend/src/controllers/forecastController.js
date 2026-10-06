import { sendSuccess, sendError } from '../utils/response.js';
import { buildForecast } from '../utils/forecastUtils.js';
import { sendControllerError } from '../utils/controllerError.js';

// GET /api/forecast
export const getForecast = async (req, res) => {
  try {
    const data = await buildForecast(req.user._id, {
      allowML: req.user.preferences?.transactionDataForAI !== false,
    });
    return sendSuccess(res, 200, 'Forecast fetched', data);
  } catch (error) {
    return sendControllerError(res, error, 'forecast', 'Failed to generate forecast');
  }
};
