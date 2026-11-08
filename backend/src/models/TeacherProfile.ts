import mongoose, { Schema, Document } from "mongoose";

export interface ITeacherProfile extends Document {
  id: string;
  userId: string;
  tenantId: string;
  employeeId: string;
  department?: string;
  primarySubject?: string;
  qualification?: string;
  experienceYears?: number;
  phone?: string;
  joiningDate?: Date;
  coordinatorForClasses?: string[];
  status: "ACTIVE" | "INACTIVE";
  specialization?: string | null;
  assignedClassId?: string | null;
  isClassTeacher: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherProfileSchema = new Schema<ITeacherProfile>(
  {
    userId: { type: String, required: true, unique: true, ref: "User", index: true },
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    employeeId: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: "General" },
    primarySubject: { type: String, trim: true, default: "General" },
    qualification: { type: String, trim: true },
    experienceYears: { type: Number, default: 0 },
    phone: { type: String, trim: true },
    joiningDate: { type: Date, default: Date.now },
    coordinatorForClasses: { type: [String], default: [] },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE", index: true },
    specialization: { type: String, trim: true },
    assignedClassId: { type: String, ref: "SchoolClass", default: null },
    isClassTeacher: { type: Boolean, default: false },
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

TeacherProfileSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });

export const TeacherProfile =
  mongoose.models.TeacherProfile ||
  mongoose.model<ITeacherProfile>("TeacherProfile", TeacherProfileSchema);
