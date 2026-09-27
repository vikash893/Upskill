const User = require("../models/user");

const getAllUsers = async (req, res) => {
    try {

        const allUsers = await User.find().select("-password");

        return res.status(200).json({
            message: "All users",
            users: allUsers
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


const getUserByid = async (req, res) => {
    try {
        const email = req.user.email;

        if (!email) {
            return res.status(400).json({
                error: "Invalid Token"
            });
        }

        const checkUser = await User.findOne({ email }).select("-password");

        if (!checkUser) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        return res.status(200).json({
            user: {
                id: checkUser._id,
                _id: checkUser._id,
                email: checkUser.email,
                name: checkUser.name,
                phone: checkUser.phone,
                photo: checkUser.photo ? checkUser.photo.replace(/\\/g, "/") : null,
                createdAt: checkUser.createdAt
            }
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};





// Admin controlles

const updateUserByid = async (req, res) => {
    try {
        // Get email from verified JWT
        const email = req.user.email;

        if (!email) {
            return res.status(401).json({
                error: "Invalid token"
            });
        }

        // Get fields that user wants to update
        const { name, phone } = req.body;

        // Check user exists
        const userExist = await User.findOne({ email });

        if (!userExist) {
            return res.status(404).json({
                error: "User doesn't exist"
            });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (req.file) {
            updateData.photo = `uploads/${req.file.filename}`.replace(/\\/g, "/");
        }

        // Update user
        const updatedUser = await User.findOneAndUpdate(
            { email },
            updateData,
            {
                new: true
            }
        ).select("-password");

        return res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: updatedUser._id,
                _id: updatedUser._id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                photo: updatedUser.photo ? updatedUser.photo.replace(/\\/g, "/") : null,
                createdAt: updatedUser.createdAt
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};


const deleteUserByid = async (req, res) => {
    try {

        // Get email from verified JWT
        const email = req.user.email;

        if (!email) {
            return res.status(401).json({
                error: "Invalid token"
            });
        }

        // Check user exists
        const emailExist = await User.findOne({ email });

        if (!emailExist) {
            return res.status(404).json({
                error: "User does not exist"
            });
        }

        // Delete user
        await User.findOneAndDelete({ email });

        return res.status(200).json({
            message: "User deleted successfully"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};

module.exports = { getAllUsers, getUserByid, updateUserByid, deleteUserByid };