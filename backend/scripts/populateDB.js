const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });
const Category = require("../models/Category");
const SubscriptionBox = require("../models/SubscriptionBox");

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

const sampleSubscriptions = [
    {
        name: "Tech Gadget Box",
        categoryName: "Tech",
        description: "A curated box of the latest tech gadgets and accessories.",
        price: "$29.99",
        website: "https://example.com/tech-box",
        affiliateLink: "https://affiliate.example.com/tech-box",
        rating: 4.8,
        ratingsCount: 120,
        clicks: 50,
        imageUrl: "https://via.placeholder.com/150"
    },
    {
        name: "Book Lovers Subscription",
        categoryName: "Books",
        description: "Hand-picked books delivered every month for avid readers.",
        price: "$19.99",
        website: "https://example.com/book-box",
        affiliateLink: "https://affiliate.example.com/book-box",
        rating: 4.5,
        ratingsCount: 95,
        clicks: 40,
        imageUrl: "https://via.placeholder.com/150"
    }
];

const populateDB = async () => {
    try {
        await SubscriptionBox.deleteMany({});
        console.log("✅ Cleared old subscription boxes");

        // Fetch all categories and map them by name
        const categories = await Category.find({});
        const categoryMap = {};
        categories.forEach(cat => categoryMap[cat.name] = cat._id);

        // Insert subscription boxes with correct ObjectId references
        const formattedSubscriptions = sampleSubscriptions.map(sub => ({
            ...sub,
            category: categoryMap[sub.categoryName] || null  // Convert categoryName to ObjectId
        }));

        await SubscriptionBox.insertMany(formattedSubscriptions);
        console.log("✅ Database populated with subscription offers!");

        mongoose.connection.close();
    } catch (error) {
        console.error("❌ Error populating database:", error);
        mongoose.connection.close();
    }
};

populateDB();
