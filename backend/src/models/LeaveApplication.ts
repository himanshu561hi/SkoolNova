import mongoose, { Schema, Document } from "mongoose";

export interface ILeaveApplication extends Document {
  id: string;
  tenantId: string;
  applicantUserId: string;
  role: string;
  classId?: string | null;
  subject: string;
  description: string;
  startDate: Date;
  endDate: Date;
  documentUrl?: string | null;
  status: "PENDING_TEACHER" | "PENDING_MANAGER" | "APPROVED" | "REJECTED";
  teacherRemark?: string | null;
  managerRemark?: string | null;
  reviewedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveApplicationSchema = new Schema<ILeaveApplication>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    applicantUserId: { type: String, required: true, ref: "User", index: true },
    role: { type: String, required: true },
    classId: { type: String, ref: "SchoolClass", default: null },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    documentUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ["PENDING_TEACHER", "PENDING_MANAGER", "APPROVED", "REJECTED"],
      default: "PENDING_MANAGER",
      index: true,
    },
    teacherRemark: { type: String, default: null },
    managerRemark: { type: String, default: null },
    reviewedByUserId: { type: String, ref: "User", default: null },
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

export const LeaveApplication =
  mongoose.models.LeaveApplication ||
  mongoose.model<ILeaveApplication>("LeaveApplication", LeaveApplicationSchema);
