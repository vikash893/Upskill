const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");
const upload = require("../config/multer");
const { getAllUsers, getUserByid, updateUserByid, deleteUserByid } = require("../controller/userInfo");

const getUserRouter = express.Router();

getUserRouter.get(
    "/users",
    authMiddleware,
    requireRole("ADMIN"),
    getAllUsers
);

getUserRouter.get(
    "/user/id", 
    authMiddleware , 
    getUserByid
)


getUserRouter.patch(
    "/updateUser", 
    authMiddleware, 
    upload.single("photo"),
    updateUserByid 
)

getUserRouter.patch(
    "/updateProfile", 
    authMiddleware, 
    upload.single("photo"),
    updateUserByid 
)

getUserRouter.delete(
    "/deleteUser",
    authMiddleware,
    deleteUserByid
)


module.exports = getUserRouter;