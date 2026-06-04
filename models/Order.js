import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String },
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
});

const shippingInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  houseNo: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  pinCode: { type: String, required: true },
  phone: { type: String, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderItems: [orderItemSchema],
    shippingInfo: shippingInfoSchema,
    serviceType: {
      type: String,
      enum: ["delivery", "dinein", "takeaway"],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "pac", "online"],
      required: true,
    },
    paymentInfo: {
      id: String,
      status: String,
    },
    itemsPrice: { type: Number, required: true, default: 0 },
    taxPrice: { type: Number, required: true, default: 0 },
    shippingCharges: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    orderStatus: {
      type: String,
      enum: ["Processing", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Cancelled"],
      default: "Processing",
    },
    isPaid: { type: Boolean, default: false },
    paidAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true }
);

// Index for common queries
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;
