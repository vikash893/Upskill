const mongoose = require("mongoose");

const termsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            default: "UniSkill Terms of Service & Privacy Policy"
        },
        content: {
            type: String,
            default: `Welcome to UniSkill. By registering an account and using our platform, you agree to our Terms of Service and Privacy Policy.

1. PRIVACY & DATA PROTECTION
Your personal information (including your name, email, phone number, and submitted coursework) is stored securely and is strictly private. We never sell or share your personal data with unauthorized third parties.

2. SYSTEM ACTIVITY & IP ADDRESS LOGGING
To maintain platform security, prevent unauthorized access, prevent cheating, and provide a secure digital environment, UniSkill securely logs your IP address, device metadata, and system requests during your sessions. This data is used exclusively for platform integrity, security audits, and attendance verification.

3. CLASSROOM & LIVE SESSIONS
Live classes and recording archives are provided solely for educational purposes for enrolled students. Unauthorized distribution of course content, live class links, or recording media is prohibited.

4. ACCOUNTS & CERTIFICATIONS
Students are expected to submit original work for all assignments and project milestones.

For questions regarding our privacy practices, contact us at privacy@uniskill.in.`
        },
        ip_logging_notice: {
            type: String,
            default: "Notice: We log your IP address and security audit records to ensure safe authentication and session verification. Your data is encrypted and kept private."
        },
        version: {
            type: String,
            default: "1.0.0"
        },
        updated_by: {
            type: String,
            default: "Admin"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Terms", termsSchema);
