const User = require('../models/User');
const { generateToken, verifyToken } = require('../config/jwt');
const { generateOTP, sendOTPviaEmail } = require('../services/otpService');
const demoEmail = (process.env.DEMO_LOGIN_EMAIL || 'rit7house@gmail.com').trim().toLowerCase();
const demoPassword = process.env.DEMO_LOGIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : '123123');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { name, email, phoneNumber, password, role } = req.body;

        // Allow repeated registrations — previous uniqueness checks removed

        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const user = await User.create({
            name,
            email,
            phoneNumber: phoneNumber || undefined,
            password,
            role,
            otp,
            otpExpires
        });

        await sendOTPviaEmail(email, otp);

        res.status(201).json({
            message: 'User registered. Please verify your email with the OTP sent.',
            userId: user._id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password, role: requestedRole } = req.body;

        // The fixed demo account supports both sign-in screens. Keep its
        // stored identity stable and issue the selected role for this session.
        if (
            typeof email === 'string' &&
            typeof password === 'string' &&
            email.trim().toLowerCase() === demoEmail &&
            password === demoPassword
        ) {
            if (requestedRole !== undefined && !['student', 'admin'].includes(requestedRole)) {
                return res.status(400).json({ message: 'Choose Student or Admin sign-in.' });
            }
            const sessionRole = requestedRole || 'student';
            let user = await User.findOne({ email: demoEmail });

            if (!user) {
                user = new User({
                    name: 'Ritwik',
                    email: demoEmail,
                    password,
                    role: 'student',
                    isVerified: true,
                    verificationStatus: 'approved',
                });
            } else {
                user.password = password;
                user.isVerified = true;
                user.verificationStatus = 'approved';
            }

            const token = generateToken({ id: user._id, role: sessionRole });
            const refreshToken = generateToken({ id: user._id, role: sessionRole, type: 'refresh' });
            user.refreshToken = refreshToken;
            await user.save();

            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: sessionRole,
                token,
                refreshToken,
                avatarUrl: user.avatarUrl,
                hackScore: user.hackScore,
                isVerified: user.isVerified,
                bio: user.bio, college: user.college, location: user.location, skills: user.skills,
                githubUrl: user.githubUrl, portfolioUrl: user.portfolioUrl,
            });
        }

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            if (!user.isVerified) {
                return res.status(401).json({ message: 'Please verify your email first' });
            }

            const token = generateToken({ id: user._id, role: user.role });
            const refreshToken = generateToken({ id: user._id }); // In real app, use different secret/expiry

            user.refreshToken = refreshToken;
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
                token,
                refreshToken,
                avatarUrl: user.avatarUrl,
                hackScore: user.hackScore,
                isVerified: user.isVerified,
                bio: user.bio, college: user.college, location: user.location, skills: user.skills,
                githubUrl: user.githubUrl, portfolioUrl: user.portfolioUrl,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await sendOTPviaEmail(email, otp);

        res.json({ message: 'New OTP sent to email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Logout user / clear refresh token
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        const { userId } = req.body; // Or get from auth middleware req.user
        const user = await User.findById(userId);
        if (user) {
            user.refreshToken = undefined;
            await user.save();
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res) => {
    const { token } = req.body;

    if (!token) return res.status(401).json({ message: 'Refresh token required' });

    try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id);

        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        const sessionRole = user.email === demoEmail && ['student', 'admin'].includes(decoded.role)
            ? decoded.role : user.role;
        const newToken = generateToken({ id: user._id, role: sessionRole });
        res.json({ token: newToken });
    } catch (error) {
        res.status(403).json({ message: 'Invalid refresh token' });
    }
};
