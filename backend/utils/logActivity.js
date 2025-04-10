const Log = require('../models/Log');

const logActivity = async (req, action) => {
  try {
    const log = new Log({
      userId: req.user?._id,
      email: req.user?.email,
      role: req.user?.role,
      action,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    await log.save();
  } catch (err) {
    console.error('Logging failed:', err.message);
  }
};

module.exports = logActivity;
