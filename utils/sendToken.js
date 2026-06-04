/**
 * Send JWT token as an HttpOnly cookie
 */
export const sendToken = (user, statusCode, res, message) => {
  const token = user.getJWT();

  const cookieOptions = {
    expires: new Date(
      Date.now() + (parseInt(process.env.COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  };

  // Remove sensitive fields before sending user object
  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    photo: user.photo,
    createdAt: user.createdAt,
  };

  res.status(statusCode).cookie("token", token, cookieOptions).json({
    success: true,
    message,
    user: safeUser,
  });
};
