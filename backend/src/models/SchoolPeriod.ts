import mongoose, { Schema, Document } from "mongoose";

export interface ISchoolPeriod extends Document {
  id: string;
  tenantId: string;
  periodIndex: number;
  periodNumber?: number;
  startTime: string;
  endTime: string;
  isLunch: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolPeriodSchema = new Schema<ISchoolPeriod>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    periodIndex: { type: Number, required: true },
    periodNumber: { type: Number },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isLunch: { type: Boolean, default: false },
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

SchoolPeriodSchema.index({ tenantId: 1, periodIndex: 1 }, { unique: true });

export const SchoolPeriod =
  mongoose.models.SchoolPeriod ||
  mongoose.model<ISchoolPeriod>("SchoolPeriod", SchoolPeriodSchema);
