import mongoose, { Schema, Document } from "mongoose";

export interface ITimetableSlot extends Document {
  id: string;
  tenantId: string;
  classId: string;
  className?: string;
  subjectId?: string | null;
  subjectName: string;
  teacherId: string;
  periodId: string;
  periodIndex: number;
  dayOfWeek: number;
  roomNumber?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSlotSchema = new Schema<ITimetableSlot>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    classId: { type: String, required: true, ref: "SchoolClass", index: true },
    className: { type: String, trim: true },
    subjectId: { type: String, ref: "ClassSubject", default: null },
    subjectName: { type: String, required: true, trim: true },
    teacherId: { type: String, required: true, ref: "TeacherProfile", index: true },
    periodId: { type: String, required: true, ref: "SchoolPeriod" },
    periodIndex: { type: Number, required: true },
    dayOfWeek: { type: Number, required: true, min: 1, max: 7 },
    roomNumber: { type: String, default: null },
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

TimetableSlotSchema.index({ tenantId: 1, classId: 1, periodId: 1, dayOfWeek: 1 }, { unique: true });
TimetableSlotSchema.index({ tenantId: 1, teacherId: 1, periodId: 1, dayOfWeek: 1 });

export const TimetableSlot =
  mongoose.models.TimetableSlot ||
  mongoose.model<ITimetableSlot>("TimetableSlot", TimetableSlotSchema);
