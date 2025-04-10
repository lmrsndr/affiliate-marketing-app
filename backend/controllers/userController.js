// controllers/userController.js
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')

const User = require('../models/User')
const logActivity = require('../utils/logActivity') // Optional but recommended

const hashCode = code => crypto.createHash('sha256').update(code).digest('hex')

// -------------------- GENERAL --------------------
exports.updateProfile = async (req, res) => {
  try {
    const { displayName, bio } = req.body
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.displayName = displayName || user.displayName
    user.bio = bio || user.bio
    await user.save()

    res.status(200).json({ user })
  } catch (err) {
    console.error('Error updating profile:', err)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

// -------------------- SECURITY --------------------
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) return res.status(401).json({ message: 'Incorrect current password' })

    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(newPassword, salt)
    await user.save()

    res.status(200).json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('Error changing password:', err)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

// -------------------- 2FA --------------------
exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const secret = speakeasy.generateSecret({ name: `BundleBee (${user.email})` })
    user.twoFactorTempSecret = secret.base32
    await user.save()

    const qrCode = await QRCode.toDataURL(secret.otpauth_url)
    res.status(200).json({ qrCode, manualEntry: secret.base32 })
  } catch (err) {
    console.error('Error setting up 2FA:', err)
    res.status(500).json({ message: 'Failed to initiate 2FA setup' })
  }
}

exports.verify2FA = async (req, res) => {
  try {
    const { token } = req.body
    const user = await User.findById(req.user._id)
    if (!user || !user.twoFactorTempSecret) {
      return res.status(400).json({ message: '2FA setup not initiated' })
    }

    const isVerified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token,
      window: 1
    })

    if (!isVerified) return res.status(401).json({ message: 'Invalid 2FA code' })

    user.twoFactorSecret = user.twoFactorTempSecret
    user.twoFactorTempSecret = undefined
    user.twoFactorEnabled = true

    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      const raw = crypto.randomBytes(4).toString('hex')
      backupCodes.push({ raw, hashed: hashCode(raw) })
    }
    user.backupCodes = backupCodes.map(code => code.hashed)
    await user.save()

    res.status(200).json({ message: '2FA enabled', backupCodes: backupCodes.map(code => code.raw) })
  } catch (err) {
    console.error('Error verifying 2FA:', err)
    res.status(500).json({ message: 'Failed to verify 2FA' })
  }
}

exports.disable2FA = async (req, res) => {
  try {
    const { password, backupCode } = req.body
    const user = await User.findById(req.user._id)
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ message: '2FA not enabled' })

    let verified = false
    if (password) verified = await bcrypt.compare(password, user.password)
    if (!verified && backupCode) {
      const hashed = hashCode(backupCode)
      verified = user.backupCodes.includes(hashed)
      if (verified) user.backupCodes = user.backupCodes.filter(c => c !== hashed)
    }

    if (!verified) return res.status(401).json({ message: 'Verification failed' })

    user.twoFactorSecret = undefined
    user.twoFactorTempSecret = undefined
    user.twoFactorEnabled = false
    user.backupCodes = []
    await user.save()

    res.status(200).json({ message: '2FA disabled' })
  } catch (err) {
    console.error('Error disabling 2FA:', err)
    res.status(500).json({ message: 'Failed to disable 2FA' })
  }
}

exports.getBackupCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ message: '2FA not enabled' })
    if (!user.backupCodes || user.backupCodes.length === 0) {
      return res.status(404).json({ message: 'No backup codes found. Regenerate required.' })
    }
    res.status(200).json({ message: 'Backup codes exist. Regenerate to see them again.' })
  } catch (err) {
    console.error('Error getting backup codes:', err)
    res.status(500).json({ message: 'Failed to get backup codes' })
  }
}

exports.regenerateBackupCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ message: '2FA not enabled' })

    const backupCodes = []
    for (let i = 0; i < 10; i++) {
      const raw = crypto.randomBytes(4).toString('hex')
      backupCodes.push({ raw, hashed: hashCode(raw) })
    }
    user.backupCodes = backupCodes.map(code => code.hashed)
    await user.save()

    res.status(200).json({ message: 'Backup codes regenerated', backupCodes: backupCodes.map(c => c.raw) })
  } catch (err) {
    console.error('Error regenerating backup codes:', err)
    res.status(500).json({ message: 'Failed to regenerate backup codes' })
  }
}

// -------------------- SESSIONS --------------------
exports.getSessions = async (req, res) => {
  // Placeholder — depends on how sessions are stored (Mongo, Redis, etc.)
  res.status(200).json({ sessions: [] })
}

exports.logoutSession = async (req, res) => {
  // Placeholder — identify and remove a specific session
  res.status(200).json({ message: 'Session terminated' })
}

exports.logoutAllSessions = async (req, res) => {
  // Placeholder — destroy all sessions for user except current
  res.status(200).json({ message: 'All sessions logged out' })
}

// -------------------- NOTIFICATIONS --------------------
exports.getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    res.status(200).json({ preferences: user.notificationPreferences || {} })
  } catch (err) {
    console.error('Error getting notification prefs:', err)
    res.status(500).json({ message: 'Failed to load preferences' })
  }
}

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    user.notificationPreferences = req.body
    await user.save()
    res.status(200).json({ message: 'Preferences updated' })
  } catch (err) {
    console.error('Error updating notification prefs:', err)
    res.status(500).json({ message: 'Failed to save preferences' })
  }
}

// -------------------- ACTIVITY --------------------
exports.getActivityLog = async (req, res) => {
  try {
    const ActivityLog = require('../models/ActivityLog')
    const logs = await ActivityLog.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(50)
    res.status(200).json({ activity: logs })
  } catch (err) {
    console.error('Error fetching activity log:', err)
    res.status(500).json({ message: 'Failed to fetch activity' })
  }
}

// -------------------- APPEARANCE --------------------
exports.getAppearancePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    res.status(200).json({ preferences: user.appearance || {} })
  } catch (err) {
    console.error('Error getting appearance prefs:', err)
    res.status(500).json({ message: 'Failed to load preferences' })
  }
}

exports.updateAppearancePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    user.appearance = req.body
    await user.save()
    res.status(200).json({ message: 'Preferences updated' })
  } catch (err) {
    console.error('Error updating appearance prefs:', err)
    res.status(500).json({ message: 'Failed to save preferences' })
  }
}
