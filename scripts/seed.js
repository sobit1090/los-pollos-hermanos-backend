/**
 * Seed Script — run with: node scripts/seed.js
 * Populates MongoDB with sample menu items so you can start right away.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import MenuItem from "../models/MenuItem.js";

dotenv.config({ path: "./config/config.env" });

const ITEMS = [
  {
    name: "Los Pollos Classic Burger",
    description: "Our signature juicy beef patty with crispy lettuce, tomato, onion, pickles, and our secret sauce in a toasted sesame bun.",
    price: 279,
    category: "signature",
    image: { public_id: "", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400" },
    tags: { popular: true, spicy: false, vegetarian: false },
    preparationTime: 12,
    calories: 580,
  },
  {
    name: "Crispy Chicken Deluxe",
    description: "Hand-battered crispy fried chicken breast with jalapeño mayo, coleslaw, and pickles.",
    price: 319,
    category: "chicken",
    image: { public_id: "", url: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400" },
    tags: { popular: true, spicy: false, vegetarian: false },
    preparationTime: 15,
    calories: 620,
  },
  {
    name: "Spicy Fiesta Burger",
    description: "Double beef patty with ghost pepper cheese, habanero sauce, jalapeños, and crispy onions.",
    price: 349,
    category: "signature",
    image: { public_id: "", url: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400" },
    tags: { popular: false, spicy: true, vegetarian: false },
    preparationTime: 14,
    calories: 710,
  },
  {
    name: "Garden Veggie Burger",
    description: "Plant-based patty with avocado, roasted peppers, arugula, and vegan aioli.",
    price: 249,
    category: "veg",
    image: { public_id: "", url: "https://images.unsplash.com/photo-1550950158-d0d960dff596?w=400" },
    tags: { popular: false, spicy: false, vegetarian: true },
    preparationTime: 10,
    calories: 440,
  },
  {
    name: "Family Combo",
    description: "2 Classic Burgers + 2 Crispy Chicken + 4 Regular Fries + 4 Soft Drinks.",
    price: 999,
    category: "combo",
    image: { public_id: "", url: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400" },
    tags: { popular: true, spicy: false, vegetarian: false },
    preparationTime: 20,
    calories: 2400,
  },
  {
    name: "Loaded Cheese Fries",
    description: "Crispy waffle fries topped with cheddar cheese sauce, bacon bits, jalapeños and sour cream.",
    price: 149,
    category: "sides",
    image: { public_id: "", url: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400" },
    tags: { popular: true, spicy: false, vegetarian: false },
    preparationTime: 8,
    calories: 490,
  },
  {
    name: "Classic Chocolate Milkshake",
    description: "Thick and creamy hand-crafted chocolate milkshake topped with whipped cream.",
    price: 129,
    category: "beverages",
    image: { public_id: "", url: "https://images.unsplash.com/photo-1572490122747-3e9c1a2a9940?w=400" },
    tags: { popular: false, spicy: false, vegetarian: true },
    preparationTime: 5,
    calories: 380,
  },
  {
    name: "Paneer Tikka Burger",
    description: "Marinated paneer tikka with mint chutney, caramelised onions, and cheese in a toasted bun.",
    price: 229,
    category: "veg",
    image: { public_id: "", url: "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400" },
    tags: { popular: true, spicy: true, vegetarian: true },
    preparationTime: 12,
    calories: 510,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "los-pollos" });
  console.log("✅ Connected to MongoDB");

  await MenuItem.deleteMany({});
  console.log("🗑  Cleared existing menu items");

  await MenuItem.insertMany(ITEMS);
  console.log(`🌱 Seeded ${ITEMS.length} menu items`);

  await mongoose.disconnect();
  console.log("👋 Disconnected. Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
