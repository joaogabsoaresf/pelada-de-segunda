import mongoose, { Schema, Document } from "mongoose";

export interface IAdminUser extends Document {
  firstName: string;
  lastName: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AdminUserSchema.set("toJSON", {
  transform: (_: any, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

export const AdminUser =
  (mongoose.models.AdminUser as mongoose.Model<IAdminUser>) ??
  mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);
