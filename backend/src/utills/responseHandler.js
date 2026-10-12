/**
 * Standard API Response Utilities
 */

const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, message = 'An error occurred', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message
  };

  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message || error;
    if (error.stack) response.stack = error.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  errorResponse
};
