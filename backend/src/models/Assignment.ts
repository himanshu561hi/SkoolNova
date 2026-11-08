import mongoose, { Schema, Document } from "mongoose";

export interface IAssignment extends Document {
  id: string;
  tenantId: string;
  classId: string;
  className?: string;
  subjectName: string;
  teacherId: string;
  title: string;
  description: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    classId: { type: String, required: true, ref: "SchoolClass", index: true },
    className: { type: String, trim: true },
    subjectName: { type: String, required: true, trim: true },
    teacherId: { type: String, required: true, ref: "TeacherProfile", index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    attachmentName: { type: String, default: null },
    attachmentUrl: { type: String, default: null },
    dueDate: { type: Date, required: true },
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

export const Assignment =
  mongoose.models.Assignment || mongoose.model<IAssignment>("Assignment", AssignmentSchema);
