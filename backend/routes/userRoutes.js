const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const { GridFsStorage } = require("multer-gridfs-storage");
const User = require("../models/User");
const userController = require("../controllers/userController");
const authenticateToken = require("../middleware/authMiddleware");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const roleMiddleware = require("../middleware/roleMiddleware");

// ✅ Initialize GridFS once MongoDB is connected
const conn = mongoose.connection;
let gfs;
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("profilePictures");
});

// ✅ Multer storage engine for GridFS
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: async (req, file) => {
    if (!req.user) throw new Error("Unauthorized upload attempt");
    return {
      filename: `${req.user._id}-${Date.now()}-${file.originalname}`,
      bucketName: "profilePictures",
    };
  },
});

const upload = multer({ storage });

/** ------------------------------------------------------------------
 * ✅ PUBLIC/USER ROUTES (protected with 2FA)
 -------------------------------------------------------------------*/

router.get("/profile", authenticateToken, requireVerified2FA, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized: Missing user info" });
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/upload-profile-picture", authenticateToken, requireVerified2FA, upload.single("profilePicture"), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { profilePicture: req.file.filename });
    res.json({ profilePicture: `/api/user/profile-picture/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/profile-picture/:filename", authenticateToken, requireVerified2FA, async (req, res) => {
  try {
    if (!gfs) return res.status(500).json({ message: "GridFS not initialized" });

    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      if (!file || file.length === 0) return res.status(404).json({ message: "Not found" });

      const readStream = gfs.createReadStream(file.filename);
      readStream.pipe(res);
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

router.delete("/delete-profile-picture", authenticateToken, requireVerified2FA, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.profilePicture) return res.status(400).json({ message: "No picture to delete" });

    gfs.remove({ filename: user.profilePicture, root: "profilePictures" }, (err) => {
      if (err) return res.status(500).json({ message: "Failed to delete file" });
    });

    await User.findByIdAndUpdate(req.user._id, { profilePicture: null });
    res.json({ message: "Profile picture deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// ✅ Profile settings
router.put("/profile", authenticateToken, requireVerified2FA, userController.updateProfile);
router.post("/change-password", authenticateToken, requireVerified2FA, userController.changePassword);

// ✅ 2FA management (protected only by login, since it's how 2FA is activated)
router.post("/2fa/setup", authenticateToken, userController.setup2FA);
router.post("/2fa/verify", authenticateToken, userController.verify2FA);
router.post("/2fa/disable", authenticateToken, userController.disable2FA);
router.get("/2fa/backup-codes", authenticateToken, requireVerified2FA, userController.getBackupCodes);
router.post("/2fa/backup-codes/regenerate", authenticateToken, requireVerified2FA, userController.regenerateBackupCodes);

// ✅ Sessions
router.get("/sessions", authenticateToken, requireVerified2FA, userController.getSessions);
router.post("/logout-session", authenticateToken, requireVerified2FA, userController.logoutSession);
router.post("/logout-all", authenticateToken, requireVerified2FA, userController.logoutAllSessions);

// ✅ Notifications
router.get("/notifications", authenticateToken, requireVerified2FA, userController.getNotificationPreferences);
router.put("/notifications", authenticateToken, requireVerified2FA, userController.updateNotificationPreferences);

// ✅ Activity log
router.get("/activity", authenticateToken, requireVerified2FA, userController.getActivityLog);

// ✅ Appearance
router.get("/appearance", authenticateToken, requireVerified2FA, userController.getAppearancePreferences);
router.put("/appearance", authenticateToken, requireVerified2FA, userController.updateAppearancePreferences);

/** ------------------------------------------------------------------
 * ✅ ADMIN ROUTES (already admin-protected)
 -------------------------------------------------------------------*/
router.get("/all", authenticateToken, requireVerified2FA, roleMiddleware("admin"), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.get("/:id", authenticateToken, requireVerified2FA, roleMiddleware("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error retrieving user" });
  }
});

router.post("/add", authenticateToken, requireVerified2FA, roleMiddleware("admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ name, email, password, role });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: "Error creating user" });
  }
});

router.patch("/:id/suspend", authenticateToken, requireVerified2FA, roleMiddleware("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.suspended = !user.suspended;
    await user.save();
    res.json({ message: `User ${user.suspended ? "suspended" : "unsuspended"}` });
  } catch (err) {
    res.status(500).json({ message: "Error updating user status" });
  }
});

router.delete("/:id", authenticateToken, requireVerified2FA, roleMiddleware("admin"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
});

module.exports = router;
