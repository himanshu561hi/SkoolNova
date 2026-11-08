import mongoose, { Schema, Document } from "mongoose";

export interface IStudentAttendance extends Document {
  id: string;
  tenantId: string;
  studentId: string;
  classId: string;
  periodId?: string | null;
  subjectName?: string | null;
  teacherId?: string | null;
  date: Date;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY";
  markedById?: string | null;
  remarks?: string | null;
  markedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentAttendanceSchema = new Schema<IStudentAttendance>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    studentId: { type: String, required: true, ref: "StudentProfile", index: true },
    classId: { type: String, required: true, ref: "SchoolClass", index: true },
    periodId: { type: String, ref: "SchoolPeriod", default: null },
    subjectName: { type: String, default: null },
    teacherId: { type: String, default: null },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "LATE", "HALF_DAY"],
      required: true,
    },
    markedById: { type: String, default: null },
    remarks: { type: String, default: null },
    markedAt: { type: Date, default: Date.now },
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

StudentAttendanceSchema.index({ tenantId: 1, studentId: 1, periodId: 1, date: 1 });

export const StudentAttendance =
  mongoose.models.StudentAttendance ||
  mongoose.model<IStudentAttendance>("StudentAttendance", StudentAttendanceSchema);
