export const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err.message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    err.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    err.message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    err.statusCode = 400;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    err.message = `Invalid ${err.path}: ${err.value}`;
    err.statusCode = 400;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    err.message = "Invalid token, please login again";
    err.statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    err.message = "Token expired, please login again";
    err.statusCode = 401;
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
