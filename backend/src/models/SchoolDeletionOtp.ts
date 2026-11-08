import mongoose, { Schema, Document } from "mongoose";

export interface ISchoolDeletionOtp extends Document {
  id: string;
  tenantId: string;
  userId: string;
  otp: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const SchoolDeletionOtpSchema = new Schema<ISchoolDeletionOtp>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    userId: { type: String, required: true, ref: "User" },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
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

export const SchoolDeletionOtp =
  mongoose.models.SchoolDeletionOtp ||
  mongoose.model<ISchoolDeletionOtp>("SchoolDeletionOtp", SchoolDeletionOtpSchema);
