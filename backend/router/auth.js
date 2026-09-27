const express = require("express");

const upload = require("../config/multer");
const { userRegister, userlogin, googleAuth } = require("../controller/auth");

const authRouter = express.Router();

authRouter.post(
    "/register",
    upload.single("photo"),
    userRegister
);

authRouter.post(
    "/login", 
    userlogin
);

authRouter.post(
    "/google",
    googleAuth
);

module.exports = authRouter;