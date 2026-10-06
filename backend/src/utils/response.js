// sendSuccess(res, statusCode, message, data)
export const sendSuccess = (res, statusCode = 200, message = 'Success', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

// sendError(res, statusCode, message, detail, additionalData)
export const sendError = (res, statusCode = 500, message = 'Something went wrong', detail = null, additionalData = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(detail ? { detail } : {}),
    ...additionalData,
  });
};
