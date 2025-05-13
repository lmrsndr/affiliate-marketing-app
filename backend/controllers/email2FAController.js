exports.verifyEmail2FACode = async (req, res) => {
  const { code, trustThisDevice } = req.body;

  try {
    if (!req.user?._id || !["user", "admin", "partner"].includes(req.user.role)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.email2FA) {
      return res.status(400).json({ message: "No 2FA code found. Please request a new one." });
    }

    const now = new Date();

    if (user.email2FA.failedAttempts >= 5) {
      const cooldownMs = 15 * 60 * 1000;
      const lastFailed = new Date(user.email2FA.lastFailedAt || 0);
      const diff = now - lastFailed;

      if (diff < cooldownMs) {
        return res.status(429).json({
          message: "Too many failed attempts. Please wait before trying again.",
        });
      } else {
        user.email2FA.failedAttempts = 0;
        user.email2FA.lastFailedAt = null;
      }
    }

    if (user.email2FA.expiresAt < now) {
      return res.status(410).json({ message: "2FA code expired. Please request a new one." });
    }

    const submittedHash = crypto.createHash("sha256").update(code).digest("hex");
    const storedHash = user.email2FA.code;
    const match = storedHash === submittedHash;

    console.log("🔐 Code Match:", match);

    if (!match) {
      user.email2FA.failedAttempts = (user.email2FA.failedAttempts || 0) + 1;
      user.email2FA.lastFailedAt = now;
      await user.save();
      return res.status(401).json({ message: "Invalid code (match failed)" });
    }

    // ✅ Set session flags
    req.session.awaiting2FA = false;
    req.session.twoFAVerified = true;
    console.log("✅ Session updated: 2FA passed");

    // ✅ Mark user verified
    user.email2FA.verified = true;
    user.email2FA.failedAttempts = 0;
    user.email2FA.lastFailedAt = null;

    user.interactions.push({
      action: "2fa_verified",
      details: { method: "email", ip: req.ip },
      timestamp: now,
    });

    await user.save();

    // ✅ Generate access token once
    const accessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        twoFAVerified: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // ✅ Set auth cookie
    res.cookie("authCookie", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".bundlebee.co.uk",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    // ✅ Optionally trust device
    if (trustThisDevice) {
      const trustToken = jwt.sign(
        { id: user._id, purpose: "trustedDevice" },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.cookie("trustedDevice", trustToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: ".bundlebee.co.uk",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    // ✅ Set frontend-readable 2FA cookie for UI logic
    res.cookie("twoFACookie", true, {
      httpOnly: false,
      secure: true,
      sameSite: "None",
      domain: ".bundlebee.co.uk",
      path: "/",
      maxAge: 30 * 60 * 1000,
    });

    return res.status(200).json({ message: "2FA verified", accessToken });

  } catch (err) {
    console.error("❌ 2FA verification failed:", err);
    return res.status(500).json({ message: "2FA verification failed" });
  }
};
