const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const admin = require('../models/admin');
const User = require('../models/user');
const { getPaginationParams, buildPaginationMetadata } = require('../utils/pagination');

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

        const { search } = req.query;
        const filter = {};
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
        }

        const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
        const { page, limit, skip } = getPaginationParams(req, 10, 100);

        let query = User.find(filter).select("-password").sort({ createdAt: -1 });
        if (isPaginated) {
            query = query.skip(skip).limit(limit);
        }

        const [allUsers, totalCount] = await Promise.all([
            query.lean(),
            User.countDocuments(filter)
        ]);

        const formatted = allUsers.map(u => ({
            ...u,
            photo: u.photo ? u.photo.replace(/\\/g, "/") : null
        }));

        res.status(200).json({
            user: formatted,
            total: totalCount,
            pagination: buildPaginationMetadata(totalCount, page, isPaginated ? limit : (totalCount || 1))
        });
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