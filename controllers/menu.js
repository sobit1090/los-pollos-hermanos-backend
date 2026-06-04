import MenuItem from "../models/MenuItem.js";
import { ErrorHandler, catchAsync } from "../utils/ErrorHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// ─── Get All Menu Items (Public) ──────────────────────────
export const getMenuItems = catchAsync(async (req, res) => {
  const { category, vegetarian, spicy } = req.query;
  const query = { isAvailable: true };

  if (category && category !== "all") query.category = category;
  if (vegetarian === "true") query["tags.vegetarian"] = true;
  if (spicy === "true") query["tags.spicy"] = true;

  const items = await MenuItem.find(query).sort({ "tags.popular": -1, sortOrder: 1 });
  res.status(200).json({ success: true, items });
});

// ─── Admin: Create Menu Item ──────────────────────────────
export const createMenuItem = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new ErrorHandler("Please upload an image", 400));

  const imageResult = await uploadToCloudinary(req.file.buffer, "los-pollos/menu");

  const item = await MenuItem.create({
    ...req.body,
    image: imageResult,
    tags: {
      popular: req.body.popular === "true",
      spicy: req.body.spicy === "true",
      vegetarian: req.body.vegetarian === "true",
    },
  });

  res.status(201).json({ success: true, message: "Menu item created", item });
});

// ─── Admin: Update Menu Item ──────────────────────────────
export const updateMenuItem = catchAsync(async (req, res, next) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) return next(new ErrorHandler("Menu item not found", 404));

  if (req.file) {
    if (item.image?.public_id) await deleteFromCloudinary(item.image.public_id);
    const imageResult = await uploadToCloudinary(req.file.buffer, "los-pollos/menu");
    req.body.image = imageResult;
  }

  if (req.body.popular !== undefined || req.body.spicy !== undefined || req.body.vegetarian !== undefined) {
    req.body.tags = {
      popular: req.body.popular === "true" || req.body.popular === true,
      spicy: req.body.spicy === "true" || req.body.spicy === true,
      vegetarian: req.body.vegetarian === "true" || req.body.vegetarian === true,
    };
  }

  const updated = await MenuItem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, message: "Menu item updated", item: updated });
});

// ─── Admin: Delete Menu Item ──────────────────────────────
export const deleteMenuItem = catchAsync(async (req, res, next) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) return next(new ErrorHandler("Menu item not found", 404));

  if (item.image?.public_id) await deleteFromCloudinary(item.image.public_id);
  await item.deleteOne();

  res.status(200).json({ success: true, message: "Menu item deleted" });
});
