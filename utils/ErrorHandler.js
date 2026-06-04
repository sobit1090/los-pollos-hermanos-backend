export class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async wrapper to avoid try/catch boilerplate
export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
