const User = require('../models/User');
const { validateProfile } = require('../utils/profileValidator');

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -otp -otpExpires -refreshToken');
        if (user) {
            res.json({ ...user.toObject(), role: req.user.role || user.role });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update current user profile
// @route   PUT /api/users/me
// @access  Private
exports.updateMe = async (req, res) => {
    try {
        let profile;
        try { profile = validateProfile(req.body); }
        catch (error) { return res.status(400).json({ message: error.message }); }
        const user = await User.findById(req.user.id);

        if (user) {
            if (user.email === 'rit7house@gmail.com' && profile.email && profile.email !== user.email) return res.status(400).json({ message: 'This account uses a fixed sign-in email.' });

            if (profile.phoneNumber && profile.phoneNumber !== user.phoneNumber) {
                const phoneExists = await User.findOne({ phoneNumber: profile.phoneNumber, _id: { $ne: user._id } });
                if (phoneExists) {
                    return res.status(400).json({ message: 'Phone number already in use' });
                }
            }
            Object.assign(user, profile);

            if (req.body.registrationDetails) {
                user.registrationDetails = {
                    ...user.registrationDetails,
                    ...req.body.registrationDetails
                };
            }

            const updatedUser = await user.save();
            const safeUser = updatedUser.toObject();
            safeUser.role = req.user.role || safeUser.role;
            for (const key of ['password', 'otp', 'otpExpires', 'refreshToken']) delete safeUser[key];
            res.json(safeUser);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update password
// @route   PUT /api/users/me/password
// @access  Private
exports.updatePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user && (await user.matchPassword(req.body.currentPassword))) {
            user.password = req.body.newPassword;
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:userId
// @access  Private
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
