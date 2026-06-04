import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Menu item name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      enum: ["signature", "chicken", "veg", "combo", "sides", "beverages"],
      required: true,
    },
    image: {
      public_id: { type: String, default: "" },
      url: { type: String, required: true },
    },
    tags: {
      popular: { type: Boolean, default: false },
      spicy: { type: Boolean, default: false },
      vegetarian: { type: Boolean, default: false },
      newItem: { type: Boolean, default: false },
    },
    preparationTime: { type: Number, default: 15 }, // minutes
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

menuItemSchema.index({ category: 1, isAvailable: 1 });
menuItemSchema.index({ "tags.popular": 1 });

const MenuItem = mongoose.model("MenuItem", menuItemSchema);
export default MenuItem;
