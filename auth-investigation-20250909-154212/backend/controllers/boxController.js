const SubscriptionBox = require("../models/SubscriptionBox");
const Category = require("../models/Category");

// ✅ Get all subscription boxes
exports.getAllBoxes = async (req, res) => {
  try {
    const boxes = await SubscriptionBox.find().populate("category", "name");
    res.json(boxes);
  } catch (error) {
    console.error("Error fetching subscription boxes:", error);
    res.status(500).json({ message: "Error fetching subscription boxes", error });
  }
};

// ✅ Get a single subscription box by ID
exports.getBoxById = async (req, res) => {
  try {
    const box = await SubscriptionBox.findById(req.params.id).populate("category", "name");
    if (!box) return res.status(404).json({ message: "Subscription box not found" });
    res.json(box);
  } catch (error) {
    console.error("Error fetching subscription box:", error);
    res.status(500).json({ message: "Error fetching subscription box", error });
  }
};

// ✅ Create a new subscription box
exports.createBox = async (req, res) => {
  try {
    const { name, category, description, price, website, affiliateLink, imageUrl } = req.body;

    // Ensure category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) return res.status(400).json({ message: "Invalid category ID" });

    const newBox = new SubscriptionBox({
      name,
      category,
      description,
      price,
      website,
      affiliateLink,
      imageUrl,
    });

    await newBox.save();
    res.status(201).json(newBox);
  } catch (error) {
    console.error("Error creating subscription box:", error);
    res.status(500).json({ message: "Error creating subscription box", error });
  }
};

// ✅ Update a subscription box
exports.updateBox = async (req, res) => {
  try {
    const { name, category, description, price, website, affiliateLink, imageUrl } = req.body;
    const updatedBox = await SubscriptionBox.findByIdAndUpdate(
      req.params.id,
      { name, category, description, price, website, affiliateLink, imageUrl },
      { new: true }
    );
    if (!updatedBox) return res.status(404).json({ message: "Subscription box not found" });

    res.json(updatedBox);
  } catch (error) {
    console.error("Error updating subscription box:", error);
    res.status(500).json({ message: "Error updating subscription box", error });
  }
};

// ✅ Delete a subscription box
exports.deleteBox = async (req, res) => {
  try {
    const deletedBox = await SubscriptionBox.findByIdAndDelete(req.params.id);
    if (!deletedBox) return res.status(404).json({ message: "Subscription box not found" });

    res.json({ message: "Subscription box deleted" });
  } catch (error) {
    console.error("Error deleting subscription box:", error);
    res.status(500).json({ message: "Error deleting subscription box", error });
  }
};
