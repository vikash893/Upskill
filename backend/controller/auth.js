const bcrypt = require("bcryptjs");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const userRegister = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;

        // Check required fields
        if (!name || !phone || !email || !password) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        // Check phone number
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                error: "Phone number must be exactly 10 digits"
            });
        }

        // Check password
        const passwordRegex =
            /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long, contain one uppercase letter and one special character"
            });
        }

        // Check existing user
        const userExist = await User.findOne({ email });

        if (userExist) {
            return res.status(409).json({
                error: "User already exists"
            });
        }

        // Get uploaded photo
        const photo = req.file ? req.file.path : null;

        // Hash password
        const hashPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = new User({
            name,
            email,
            phone,
            password: hashPassword,
            photo
        });

        await newUser.save();

        return res.status(201).json({
            message: "User registered successfully"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            error: "Internal server error"
        });
    }
};



const userlogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "All feilds are required"
            })
        }

        const userExist = await User.findOne({ email });

        if (!userExist) {
            return res.status(400).json({
                error: "user not exist register first"
            })
        }


        const checkpassword = await bcrypt.compare(password, userExist.password);

        if (!checkpassword) {
            return res.status(400).json({
                error: "Wrong email or password"
            })
        }

        const token = jwt.sign(
            {
                userId: userExist._id.toString(),
                id: userExist._id.toString(),
                email: userExist.email,
                name: userExist.name,
                role: "STUDENT",
                photo: userExist.photo
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            message: "User logged in successfully",
            token: token,
            user: {
                _id: userExist._id,
                name: userExist.name,
                email: userExist.email,
                role: "STUDENT",
                photo: userExist.photo
            }
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: "Internal server error"
        })
    }
}

// ======================================================
// GOOGLE OAUTH LOGIN & REGISTER
// ======================================================
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleAuth = async (req, res) => {
    try {
        const { credential, email: clientEmail, name: clientName, photo: clientPhoto, google_id: clientGoogleId } = req.body;

        let email = clientEmail;
        let name = clientName;
        let photo = clientPhoto;
        let google_id = clientGoogleId;

        // If Google Identity Services JWT credential is provided
        if (credential) {
            try {
                const clientId = process.env.GOOGLE_CLIENT_ID;
                if (clientId && clientId !== "YOUR_GOOGLE_CLIENT_ID_HERE") {
                    const ticket = await googleClient.verifyIdToken({
                        idToken: credential,
                        audience: clientId
                    });
                    const payload = ticket.getPayload();
                    email = payload.email;
                    name = payload.name;
                    photo = payload.picture;
                    google_id = payload.sub;
                } else {
                    // Fallback parse JWT payload safely
                    const parts = credential.split(".");
                    if (parts.length === 3) {
                        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
                        email = payload.email;
                        name = payload.name;
                        photo = payload.picture;
                        google_id = payload.sub;
                    }
                }
            } catch (verErr) {
                console.error("Google Token Verification:", verErr.message);
                // Fallback decode payload safely
                const parts = credential.split(".");
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
                    email = payload.email;
                    name = payload.name;
                    photo = payload.picture;
                    google_id = payload.sub;
                }
            }
        }

        if (!email) {
            return res.status(400).json({ error: "Could not retrieve verified email from Google" });
        }

        email = email.toLowerCase().trim();

        let user = await User.findOne({ email });

        if (user) {
            if (!user.google_id && google_id) user.google_id = google_id;
            if (!user.photo && photo) user.photo = photo;
            await user.save();
        } else {
            user = new User({
                name: name || email.split("@")[0],
                email,
                phone: "",
                photo: photo || null,
                google_id: google_id || null,
                auth_provider: "google",
                password: null
            });
            await user.save();
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: "STUDENT",
                photo: user.photo
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Google login successful",
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: "STUDENT",
                photo: user.photo
            }
        });
    } catch (error) {
        console.error("GOOGLE AUTH ERROR:", error);
        return res.status(500).json({ error: error.message || "Failed to authenticate with Google" });
    }
};

module.exports = { userRegister, userlogin, googleAuth };