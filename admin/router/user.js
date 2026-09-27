const express = require('express');
const authMiddleware = require('../middleware/Authmiddleware');
const admin = require('../../backend/models/admin');
const User = require('../../backend/models/user');


const adminUserRouter = express.Router(); 


// getAllUser , getUserById , UpdateUserById , deleteUserById 
adminUserRouter.get("/get-alluser" , authMiddleware , async(req , res)=> {
    try {
        const email = req.user.email ; 

        if (!email){
            return res.status(400).json({
                error : "token not found"
            })
        }

        const checkAdmin = await admin.findOne({email}); 

        if (!checkAdmin){
            return res.status(400).json({
                error : "Admin not found"
            })
        }


        const allUsers = await User.find().select("-password").sort({ createdAt: -1 }); 
        const formatted = allUsers.map(u => {
            const obj = u.toObject();
            return {
                ...obj,
                photo: obj.photo ? obj.photo.replace(/\\/g, "/") : null
            };
        });

        res.status(200).json({
            user : formatted
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error : "Internal server error "
        })
    }
})



adminUserRouter.get("/user/:userEmail" , authMiddleware ,  async(req , res)=> {
    try {
        const email = req.user.email ; 
        const {userEmail} = req.params ; 

        if (!email){
            return res.status(400).json({
                error : "token not found"
            })
        }

        const checkAdmin = await admin.findOne({email}); 

        if (!checkAdmin){
            return res.status(400).json({
                error : "Admin not found"
            })
        }

        const checkUser = await User.findOne({email: userEmail});
        if (!checkUser){
            return res.status(400).json({
                error : "User not found"
            })
        }

        return res.status(200).json({
            user : checkUser
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error : "Internal server error"
        })
    }
})



adminUserRouter.delete(
    "/delete-user/:userEmail",
    authMiddleware,
    async (req, res) => {
        try {
            // Logged-in admin email from JWT
            const email = req.user.email;

            // User email from URL
            const { userEmail } = req.params;

            if (!email) {
                return res.status(401).json({
                    error: "Token not found"
                });
            }

            // Check admin
            const checkAdmin = await admin.findOne({ email });

            if (!checkAdmin) {
                return res.status(403).json({
                    error: "Admin access denied"
                });
            }

            // Check user
            const checkUser = await User.findOne({
                email: userEmail
            });

            if (!checkUser) {
                return res.status(404).json({
                    error: "User not found"
                });
            }

            // Delete user
            await User.findOneAndDelete({
                email: userEmail
            });

            return res.status(200).json({
                message: "User deleted successfully"
            });

        } catch (error) {
            console.log(error);

            return res.status(500).json({
                error: "Internal server error"
            });
        }
    }
);

module.exports = adminUserRouter ; 