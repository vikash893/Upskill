const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Teacher = require("../models/teacher");
const Admin = require("../models/admin");
const jwt = require("jsonwebtoken");
const { persistFile } = require("../config/cloudinary");
const { google, createGoogleOAuthClient, getGoogleOAuthConfig } = require("../config/google");

const emailFilterFor = (email) => {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { email: { $regex: `^${escapedEmail}$`, $options: "i" } };
};

const userRegister = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        const normalizedEmail = String(email || "").trim().toLowerCase();

        // Check required fields
        if (!name || !phone || !normalizedEmail || !password) {
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

        const emailFilter = emailFilterFor(normalizedEmail);
        const [userExist, teacherExist, adminExist] = await Promise.all([
            User.findOne(emailFilter),
            Teacher.findOne(emailFilter),
            Admin.findOne(emailFilter)
        ]);

        if (userExist || teacherExist || adminExist) {
            return res.status(409).json({
                error: "An account with this email already exists."
            });
        }

        const photo = req.file ? await persistFile(req.file, "uniskill/avatars") : null;

        // Hash password
        const hashPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = new User({
            name,
            email: normalizedEmail,
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
            return res.status(400).json({ error: "Email and password are required." });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const emailFilter = emailFilterFor(normalizedEmail);
        const [admins, teachers, students] = await Promise.all([
            Admin.find(emailFilter).limit(2),
            Teacher.find(emailFilter).limit(2),
            User.find(emailFilter).limit(2)
        ]);

        const accounts = [
            ...admins.map(account => ({ account, role: "ADMIN" })),
            ...teachers.map(account => ({ account, role: "TEACHER" })),
            ...students.map(account => ({ account, role: "STUDENT" }))
        ];

        const matchedAccounts = await Promise.all(accounts.map(async candidate => ({
            ...candidate,
            passwordMatches: candidate.account.password
                ? await bcrypt.compare(password, candidate.account.password)
                : false
        })));
        const validAccounts = matchedAccounts.filter(candidate => candidate.passwordMatches);

        if (validAccounts.length !== 1) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const { account, role } = validAccounts[0];
        const tokenPayload = {
            id: account._id.toString(),
            email: account.email,
            name: account.name,
            role
        };
        if (role === "STUDENT") {
            tokenPayload.userId = account._id.toString();
            tokenPayload.photo = account.photo;
        } else if (role === "TEACHER") {
            tokenPayload.teacherId = account._id.toString();
        } else {
            tokenPayload.adminId = account._id.toString();
        }

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.locals.auditIdentity = {
            email: account.email,
            name: account.name,
            role
        };

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                _id: account._id,
                name: account.name,
                email: account.email,
                role,
                photo: role === "STUDENT" ? account.photo : role === "TEACHER" ? account.photo : null
            }
        });
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
        const { credential } = req.body || {};
        const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim().replace(/^["']|["']$/g, "");

        if (!credential) {
            return res.status(400).json({ error: "A Google credential is required." });
        }

        if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID_HERE") {
            return res.status(503).json({ error: "Google sign-in is not configured on the server." });
        }

        let payload;
        try {
            const client = new OAuth2Client(clientId);
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: clientId
            });
            payload = ticket.getPayload();
        } catch (verificationError) {
            let tokenAudience = "unknown";
            try {
                const decoded = jwt.decode(credential);
                tokenAudience = decoded?.aud || "unknown";
            } catch {}
            console.error(`GOOGLE_ID_TOKEN_VERIFY_ERROR: ${verificationError.message} (Server expected clientId: '${clientId}', Token contained aud: '${tokenAudience}')`);
            
            if (tokenAudience !== "unknown" && tokenAudience !== clientId) {
                return res.status(401).json({ 
                    error: `Google Client ID mismatch. Frontend sent token for audience '${tokenAudience}', but backend is configured with '${clientId}'. Please sync VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID.` 
                });
            }

            return res.status(401).json({ error: "The Google credential is invalid or expired. Please try signing in again." });
        }

        if (!payload?.email || (!payload.email_verified && payload.email_verified !== "true")) {
            return res.status(401).json({ error: "Google must verify the account email." });
        }

        const email = payload.email.toLowerCase().trim();
        const emailFilter = emailFilterFor(email);
        const [adminAccount, teacherAccount] = await Promise.all([
            Admin.findOne(emailFilter),
            Teacher.findOne(emailFilter)
        ]);
        if (adminAccount || teacherAccount) {
            return res.status(403).json({ error: "Use email and password to sign in to this account." });
        }

        let user = await User.findOne(emailFilter);

        if (user) {
            if (!user.google_id && payload.sub) user.google_id = payload.sub;
            if (!user.photo && payload.picture) user.photo = payload.picture;
            await user.save();
        } else {
            user = new User({
                name: payload.name || email.split("@")[0],
                email,
                phone: "",
                photo: payload.picture || null,
                google_id: payload.sub || null,
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
            process.env.JWT_SECRET || "uniskill_2026_secret",
            { expiresIn: "7d" }
        );

        res.locals.auditIdentity = {
            email: user.email,
            name: user.name,
            role: "STUDENT"
        };

        return res.status(200).json({
            message: "Login successful.",
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
        console.log(error);
        return res.status(500).json({
            error: "Internal server error"
        });
    }
};

const getLmsRedirectBase = () => {
    const configuredUrl = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").trim();
    return configuredUrl.replace(/\/$/, "");
};

const googleMeetAuthStart = async (req, res) => {
    try {
        if (!req.user || !req.user.teacherId) {
            return res.status(403).json({ error: "Teacher authentication required." });
        }

        if (!getGoogleOAuthConfig() || !process.env.JWT_SECRET) {
            return res.status(503).json({ error: "Google Meet authorization is not configured." });
        }

        const oauth2Client = createGoogleOAuthClient();

        const teacher = await Teacher.findById(req.user.teacherId);
        if (!teacher) {
            return res.status(404).json({ error: "Teacher account not found." });
        }

        const candidateOrigin = req.query.return_origin || req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
        let redirectOrigin = null;
        if (candidateOrigin) {
            try {
                const parsed = new URL(candidateOrigin);
                if (parsed.protocol === "https:" || ["localhost", "127.0.0.1"].includes(parsed.hostname)) {
                    redirectOrigin = parsed.origin;
                }
            } catch {}
        }

        const state = jwt.sign(
            {
                teacherId: teacher._id.toString(),
                role: "TEACHER",
                purpose: "google-meet-oauth",
                redirectOrigin: redirectOrigin || getLmsRedirectBase()
            },
            process.env.JWT_SECRET || "uniskill_2026_secret",
            { expiresIn: "10m" }
        );

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: [
                "https://www.googleapis.com/auth/calendar.events",
                "https://www.googleapis.com/auth/meetings.space.created",
                "openid",
                "email"
            ],
            state
        });

        return res.status(200).json({
            message: "Google Meet authorization started.",
            authUrl
        });
    } catch (error) {
        console.error("GOOGLE_MEET_AUTH_START_ERROR", error.message);
        return res.status(500).json({ error: "Unable to start Google Meet authorization." });
    }
};

const googleMeetAuthCallback = async (req, res) => {
    try {
        const { code, state, error: oauthError } = req.query || {};

        if (!state) {
            const fallbackBase = getLmsRedirectBase();
            return res.redirect(`${fallbackBase}/teacher/live-studio?googleMeet=error`);
        }

        let decodedState;
        try {
            decodedState = jwt.verify(
                String(state),
                process.env.JWT_SECRET || "uniskill_2026_secret"
            );
        } catch (error) {
            console.error("GOOGLE_MEET_STATE_VERIFY_ERROR:", error.message);
            return res.status(400).json({ error: "Google Meet authorization state is invalid or expired." });
        }

        const redirectBase = decodedState?.redirectOrigin || getLmsRedirectBase();

        if (oauthError) {
            return res.redirect(`${redirectBase}/teacher/live-studio?googleMeet=denied`);
        }

        if (!code || !getGoogleOAuthConfig()) {
            return res.status(400).json({ error: "Google Meet authorization was incomplete." });
        }

        const oauth2Client = createGoogleOAuthClient();

        if (decodedState.purpose !== "google-meet-oauth" || decodedState.role !== "TEACHER") {
            return res.status(400).json({ error: "Invalid Google Meet authorization request." });
        }

        const teacher = await Teacher.findById(decodedState.teacherId);
        if (!teacher) {
            return res.status(404).json({ error: "Teacher account not found." });
        }

        const { tokens } = await oauth2Client.getToken(String(code));
        if (!tokens) {
            return res.redirect(`${redirectBase}/teacher/live-studio?googleMeet=missing-refresh-token`);
        }

        oauth2Client.setCredentials(tokens);
        const scopeString = String(tokens.scope || "");
        const grantedScopes = new Set(scopeString.split(/\s+/));
        console.log("GOOGLE_OAUTH_GRANTED_SCOPES:", scopeString);

        const hasEmailScope = grantedScopes.has("email") || 
                              grantedScopes.has("https://www.googleapis.com/auth/userinfo.email") ||
                              grantedScopes.has("openid");
                              
        const hasCalendarScope = grantedScopes.has("https://www.googleapis.com/auth/calendar.events") || 
                                grantedScopes.has("https://www.googleapis.com/auth/calendar");

        const hasMeetScope = grantedScopes.has("https://www.googleapis.com/auth/meetings.space.created") || 
                             grantedScopes.has("https://www.googleapis.com/auth/meetings") ||
                             hasCalendarScope;

        if (!hasEmailScope || (!hasCalendarScope && !hasMeetScope)) {
            console.warn("GOOGLE_OAUTH_MISSING_SCOPES:", { scopeString, hasEmailScope, hasCalendarScope, hasMeetScope });
            return res.redirect(`${redirectBase}/teacher/live-studio?googleMeet=missing-scopes`);
        }

        const profile = await google.oauth2({ version: "v2", auth: oauth2Client }).userinfo.get();
        if (!profile.data?.email || profile.data.verified_email !== true) {
            return res.redirect(`${redirectBase}/teacher/live-studio?googleMeet=unverified-account`);
        }

        const verifiedGoogleEmail = profile.data.email.toLowerCase();
        const refreshToken = tokens.refresh_token || (
            teacher.google_account_email === verifiedGoogleEmail ? teacher.google_refresh_token : null
        );
        if (!refreshToken) {
            return res.redirect(`${redirectBase}/teacher/live-studio?googleMeet=missing-refresh-token`);
        }

        teacher.google_refresh_token = refreshToken;
        teacher.google_access_token = tokens.access_token || teacher.google_access_token || null;
        teacher.google_token_scope = tokens.scope || teacher.google_token_scope || null;
        teacher.google_token_expiry_date = tokens.expiry_date ? new Date(tokens.expiry_date) : teacher.google_token_expiry_date || null;
        teacher.google_account_email = verifiedGoogleEmail;
        teacher.google_meet_connected_at = new Date();
        await teacher.save();

        return res.redirect(`${redirectBase}/teacher/live-studio?googleMeet=connected`);
    } catch (error) {
        console.error("GOOGLE_MEET_AUTH_CALLBACK_ERROR", error.message);
        const fallbackBase = getLmsRedirectBase();
        return res.redirect(`${fallbackBase}/teacher/live-studio?googleMeet=error`);
    }
};

const googleMeetAuthStatus = async (req, res) => {
    try {
        if (!req.user?.teacherId) {
            return res.status(403).json({ error: "Teacher authentication required." });
        }

        const teacher = await Teacher.findById(req.user.teacherId)
            .select("google_refresh_token google_account_email google_meet_connected_at google_access_token google_token_expiry_date");
        if (!teacher) return res.status(404).json({ error: "Teacher account not found." });

        if (!teacher.google_refresh_token) {
            return res.status(200).json({ connected: false, account_email: null, connected_at: null });
        }

        const oauth2Client = createGoogleOAuthClient();
        if (!oauth2Client) {
            return res.status(200).json({ connected: false, reconnect_required: true, account_email: null });
        }

        oauth2Client.setCredentials({ refresh_token: teacher.google_refresh_token });
        const profile = await google.oauth2({ version: "v2", auth: oauth2Client }).userinfo.get();
        if (!profile.data?.email || profile.data.verified_email !== true) {
            return res.status(200).json({ connected: false, reconnect_required: true, account_email: null });
        }

        teacher.google_account_email = profile.data.email.toLowerCase();
        teacher.google_access_token = oauth2Client.credentials.access_token || teacher.google_access_token;
        teacher.google_token_expiry_date = oauth2Client.credentials.expiry_date
            ? new Date(oauth2Client.credentials.expiry_date)
            : teacher.google_token_expiry_date;
        await teacher.save();

        return res.status(200).json({
            connected: true,
            account_email: teacher.google_account_email,
            connected_at: teacher.google_meet_connected_at || null
        });
    } catch (error) {
        const errorCode = error?.response?.data?.error;
        if (errorCode === "invalid_grant" || error?.code === 401) {
            return res.status(200).json({ connected: false, reconnect_required: true, account_email: null });
        }
        console.error("GOOGLE_MEET_AUTH_STATUS_ERROR", error.message);
        return res.status(503).json({ error: "Unable to verify the Google account right now." });
    }
};

const changePassword = async (req, res) => {
    try {
        const { old_password, current_password, new_password, confirm_password } = req.body;
        const currentPassword = old_password || current_password || "";
        const newPassword = new_password || "";
        const confirmPassword = confirm_password || newPassword;

        if (!newPassword) {
            return res.status(400).json({ error: "New password is required." });
        }

        if (confirmPassword !== newPassword) {
            return res.status(400).json({ error: "New password and confirm password do not match." });
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: "New password must be at least 8 characters long, contain at least one uppercase letter and one special character (!@#$%^&*)."
            });
        }

        const email = String(req.user.email || "").toLowerCase().trim();
        const role = String(req.user.role || "").toUpperCase();
        const emailFilter = emailFilterFor(email);

        let account = null;
        if (role === "ADMIN") {
            account = await Admin.findOne(emailFilter);
        } else if (role === "TEACHER") {
            account = await Teacher.findOne(emailFilter);
        } else {
            account = await User.findOne(emailFilter);
        }

        if (!account) {
            // Fallback search in all 3 models if role not matched
            account = await User.findOne(emailFilter) || await Teacher.findOne(emailFilter) || await Admin.findOne(emailFilter);
        }

        if (!account) {
            return res.status(404).json({ error: "Account not found." });
        }

        // If account has an existing password, verify current password
        if (account.password) {
            if (!currentPassword) {
                return res.status(400).json({ error: "Current password is required." });
            }
            const isMatch = await bcrypt.compare(currentPassword, account.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Current password is incorrect." });
            }
        }

        const hashPassword = await bcrypt.hash(newPassword, 10);
        account.password = hashPassword;
        await account.save();

        return res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        return res.status(500).json({ error: "Internal server error while changing password." });
    }
};

module.exports = {
    userRegister,
    userlogin,
    googleAuth,
    googleMeetAuthStart,
    googleMeetAuthCallback,
    googleMeetAuthStatus,
    changePassword
};