import mongoose, { Schema, Document } from "mongoose";

export interface ITenant extends Document {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  status: "ACTIVE" | "INACTIVE";
  allowTeachersEditTimetable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    allowTeachersEditTimetable: { type: Boolean, default: false },
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

export const Tenant = mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);
