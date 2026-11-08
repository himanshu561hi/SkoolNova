import mongoose, { Schema, Document } from "mongoose";

export interface ITeacherAttendance extends Document {
  id: string;
  tenantId: string;
  teacherId: string;
  date: Date;
  status: "PRESENT" | "ABSENT" | "ON_LEAVE" | "HALF_DAY";
  markedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherAttendanceSchema = new Schema<ITeacherAttendance>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    teacherId: { type: String, required: true, ref: "TeacherProfile", index: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "ON_LEAVE", "HALF_DAY"],
      required: true,
    },
    markedByUserId: { type: String, default: null },
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

TeacherAttendanceSchema.index({ tenantId: 1, teacherId: 1, date: 1 }, { unique: true });

export const TeacherAttendance =
  mongoose.models.TeacherAttendance ||
  mongoose.model<ITeacherAttendance>("TeacherAttendance", TeacherAttendanceSchema);
