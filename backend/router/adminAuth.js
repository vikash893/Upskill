const express = require('express'); 
const admin = require('../models/admin');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');



const adminAuth = express.Router(); 


adminAuth.post("/create-admin" , async(req , res) => {
    try {
        const {name , email , role , password} = req.body ; 

    if (!name || !email ||!role ||!password){
        return res.status(400).json({
            error : "All feilds are required"
        })
    }

    const hashPassword = await  bcrypt.hash(password , 10); 

    const newAdmin = new admin({
        name , 
        email , 
        role , 
        password : hashPassword
    })


    await newAdmin.save(); 

    return res.status(200).json({
        message : "Admin register sucessfully"
    })
    } catch (error) {
        console.log(error); 
        return res.status(500).json({
            error : "Internal server error"
        })
    }
})


adminAuth.post("/admin-login" , async(req , res)=> {
    try {
        const {email , password} = req.body ; 

        if (!email || !password){
            return res.status(400).json({
                error : "All feilds are required "
            })
        }


        const adminExist = await admin.findOne({email}); 

        if (!adminExist){
            return res.status(400).json({
                error : "Not found"
            })
        }

        const comparePassword = await bcrypt.compare(password , adminExist.password); 

        if (!comparePassword){
            return res.status(400).json({
                error : "Wrong email or password"
            })
        }

        const token = jwt.sign({
            adminId: adminExist._id.toString(),
            email: adminExist.email,
            role: "ADMIN"
        }, 
        process.env.JWT_SECRET, 
        {expiresIn : "7d"}
    )

        res.status(200).json({
            message : "Login sucessfully", 
            token
        })
    } catch (error) {
        return res.status(500).json({
            error : "Internal server error"
        })
    }
})

module.exports = adminAuth ; 