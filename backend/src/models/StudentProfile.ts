import mongoose, { Schema, Document } from "mongoose";

export interface IStudentProfile extends Document {
  id: string;
  userId: string;
  tenantId: string;
  classId?: string | null;
  className?: string | null;
  rollNumber: string;
  standard: string;
  section: string;
  phone?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  fatherPhone?: string | null;
  motherPhone?: string | null;
  address?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  feesCleared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: { type: String, required: true, unique: true, ref: "User", index: true },
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    classId: { type: String, ref: "SchoolClass", default: null, index: true },
    className: { type: String, trim: true, default: null },
    rollNumber: { type: String, required: true, trim: true },
    standard: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true, uppercase: true },
    phone: { type: String, trim: true, default: null },
    fatherName: { type: String, trim: true, default: null },
    motherName: { type: String, trim: true, default: null },
    fatherPhone: { type: String, trim: true, default: null },
    motherPhone: { type: String, trim: true, default: null },
    address: { type: String, trim: true, default: null },
    guardianName: { type: String, trim: true, default: null },
    guardianPhone: { type: String, trim: true, default: null },
    feesCleared: { type: Boolean, default: true },
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

StudentProfileSchema.index({ tenantId: 1, standard: 1, section: 1, rollNumber: 1 });

export const StudentProfile =
  mongoose.models.StudentProfile ||
  mongoose.model<IStudentProfile>("StudentProfile", StudentProfileSchema);
