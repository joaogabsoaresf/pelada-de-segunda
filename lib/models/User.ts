import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  phone: string;
  type: "monthly" | "daily" | "goalkeeper";
  defaultPot: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ["monthly", "daily", "goalkeeper"], required: true },
    defaultPot: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

UserSchema.set("toJSON", {
  transform: (_: any, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ??
  mongoose.model<IUser>("User", UserSchema);
