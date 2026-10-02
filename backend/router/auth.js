const express = require("express");
const upload = require("../config/multer");
const { userRegister, userlogin, googleAuth, changePassword } = require("../controller/auth");
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
    "/login",
    authRateLimit,
    userlogin
);

authRouter.post(
    "/google",
    authRateLimit,
    googleAuth
);

authRouter.post(
    "/change-password",
    authMiddleware,
    changePassword
);

module.exports = authRouter;