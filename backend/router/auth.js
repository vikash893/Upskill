const express = require("express");
const upload = require("../config/multer");
const {
    userRegister,
    verifyRegisterOtp,
    resendRegisterOtp,
    userlogin,
    googleAuth,
    googleMeetAuthStart,
    googleMeetAuthCallback,
    googleMeetAuthStatus,
    changePassword
} = require("../controller/auth");
const { authRateLimit } = require("../middleware/rateLimit");
const authMiddleware = require("../middleware/authMiddleware");

const authRouter = express.Router();

authRouter.post(
    "/register",
    authRateLimit,
    upload.single("photo"),
    userRegister
);

authRouter.post(
    "/register/verify-otp",
    authRateLimit,
    verifyRegisterOtp
);

authRouter.post(
    "/verify-otp",
    authRateLimit,
    verifyRegisterOtp
);

authRouter.post(
    "/register/resend-otp",
    authRateLimit,
    resendRegisterOtp
);

authRouter.post(
    "/resend-otp",
    authRateLimit,
    resendRegisterOtp
);

authRouter.post(
    "/login",
    authRateLimit,
    userlogin
);

authRouter.post(
    "/google",
    authRateLimit,
    googleAuth
);

authRouter.get(
    "/google/meet",
    authRateLimit,
    authMiddleware,
    googleMeetAuthStart
);

authRouter.get(
    "/google/meet/status",
    authMiddleware,
    googleMeetAuthStatus
);

authRouter.get(
    "/google/meet/callback",
    googleMeetAuthCallback
);

authRouter.post(
    "/change-password",
    authMiddleware,
    changePassword
);

module.exports = authRouter;