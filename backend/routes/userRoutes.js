const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
const { GridFsStorage } = require("multer-gridfs-storage");
const User = require("../models/User");
const userController = require("../controllers/userController");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const roleMiddleware = require("../middleware/roleMiddleware");

const conn = mongoose.connection;
let gfs;
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("profilePictures");
});

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

// Verified user routes
router.use(requireVerified2FA);

router.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/upload-profile-picture", upload.single("profilePicture"), async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { profilePicture: req.file.filename });
  res.json({ profilePicture: `/api/user/profile-picture/${req.file.filename}` });
});

router.get("/profile-picture/:filename", async (req, res) => {
  if (!gfs) return res.status(500).json({ message: "GridFS not initialized" });
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (!file) return res.status(404).json({ message: "Not found" });
    gfs.createReadStream(file.filename).pipe(res);
  });
});

router.delete("/delete-profile-picture", async (_req, res) => {
  const user = await User.findById(req.user._id);
  if (!user?.profilePicture) return res.status(400).json({ message: "No picture to delete" });
  gfs.remove({ filename: user.profilePicture, root: "profilePictures" }, (err) => {
    if (err) return res.status(500).json({ message: "Failed to delete file" });
  });
  await User.findByIdAndUpdate(req.user._id, { profilePicture: null });
  res.json({ message: "Profile picture deleted" });
});

// Settings & profile
router.put ("/profile",         userController.updateProfile);
router.post("/change-password", userController.changePassword);

// Sessions
router.get ("/sessions",        userController.getSessions);
router.post("/logout-session",  userController.logoutSession);
router.post("/logout-all",      userController.logoutAllSessions);

// Notifications
router.get ("/notifications",   userController.getNotificationPreferences);
router.put ("/notifications",   userController.updateNotificationPreferences);

// Activity
router.get ("/activity",        userController.getActivityLog);

// Appearance
router.get ("/appearance",      userController.getAppearancePreferences);
router.put ("/appearance",      userController.updateAppearancePreferences);

// Admin-only under /api/user
router.get ("/all",             roleMiddleware("admin"), async (_req, res) => res.json(await User.find()));
router.get ("/:id",             roleMiddleware("admin"), async (req, res) => {
  const u = await User.findById(req.params.id); if (!u) return res.status(404).json({ message: "User not found" }); res.json(u);
});
router.post("/add",             roleMiddleware("admin"), async (req, res) => {
  const { name, email, password, role: r } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ message: "User already exists" });
  const nu = new User({ name, email, password, role: r }); await nu.save(); res.status(201).json(nu);
});
router.patch("/:id",            roleMiddleware("admin"), async (req, res) => {
  const allowed = ["name", "email", "role"];
  const update = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) update[key] = req.body[key];
  }
  const u = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!u) return res.status(404).json({ message: "User not found" });
  res.json(u);
});
router.patch("/:id/suspend",    roleMiddleware("admin"), async (req, res) => {
  const u = await User.findById(req.params.id); if (!u) return res.status(404).json({ message: "User not found" });
  u.suspended = !u.suspended; await u.save(); res.json({ message: `User ${u.suspended ? "suspended" : "unsuspended"}` });
});
router.delete("/:id",           roleMiddleware("admin"), async (req, res) => {
  await User.findByIdAndDelete(req.params.id); res.json({ message: "User deleted" });
});

module.exports = router;
