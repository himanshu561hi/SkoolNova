import mongoose, { Schema, Document } from "mongoose";

export interface IPasswordResetOtp extends Document {
  id: string;
  email: string;
  otp: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const PasswordResetOtpSchema = new Schema<IPasswordResetOtp>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Auto-delete on expiry
    used: { type: Boolean, default: false },
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

export const PasswordResetOtp =
  mongoose.models.PasswordResetOtp ||
  mongoose.model<IPasswordResetOtp>("PasswordResetOtp", PasswordResetOtpSchema);

