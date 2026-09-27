const mongoose = require('mongoose'); 

const adminSchema = new mongoose.Schema({
    name : {type : String , required : true },
    email : {type : String , required : true, unique: true }, 
    role : {type : String , enum : ["admin" , "SuperAdmin", "ADMIN"] , required:true},
    password : {type : String , required : true },
    qr_code : {type : String , default : null },
    upi_id : {type : String , default : "" },
    account_name : {type : String , default : "" }
}, {
    timestamps: true
});

module.exports = mongoose.model("admin" , adminSchema); 
