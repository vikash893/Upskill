const express = require("express");
const upload = require("../config/multer");
const { userRegister, userlogin, googleAuth } = require("../controller/auth");
const { authRateLimit } = require("../middleware/rateLimit");

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

module.exports = authRouter;