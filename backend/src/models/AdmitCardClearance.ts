import mongoose, { Schema, Document } from "mongoose";

export interface IAdmitCardClearance extends Document {
  id: string;
  examId: string;
  studentId: string;
  approved: boolean;
  feeDue: boolean;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AdmitCardClearanceSchema = new Schema<IAdmitCardClearance>(
  {
    examId: { type: String, required: true, ref: "Exam", index: true },
    studentId: { type: String, required: true, ref: "StudentProfile", index: true },
    approved: { type: Boolean, default: true },
    feeDue: { type: Boolean, default: false },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
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

AdmitCardClearanceSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export const AdmitCardClearance =
  mongoose.models.AdmitCardClearance ||
  mongoose.model<IAdmitCardClearance>("AdmitCardClearance", AdmitCardClearanceSchema);
