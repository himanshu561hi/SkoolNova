import mongoose, { Schema, Document } from "mongoose";
import { Role } from "../config/constants.js";

export interface IUser extends Document {
  id: string;
  tenantId?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: Role;
  mustChangePassword: boolean;
  isActive: boolean;
  profilePictureUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: String, ref: "Tenant", default: null, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "SCHOOL_MANAGER", "TEACHER", "STUDENT"],
      required: true,
      index: true,
    },
    mustChangePassword: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    profilePictureUrl: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for tenant scoping
UserSchema.index({ tenantId: 1, email: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
