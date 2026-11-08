import mongoose, { Schema, Document } from "mongoose";

export interface IClassSubject extends Document {
  id: string;
  tenantId: string;
  classId: string;
  subjectName: string;
  name?: string;
  code?: string;
  teacherId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSubjectSchema = new Schema<IClassSubject>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    classId: { type: String, required: true, ref: "SchoolClass", index: true },
    subjectName: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    code: { type: String, trim: true },
    teacherId: { type: String, ref: "TeacherProfile", default: null },
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

ClassSubjectSchema.pre("save", function () {});

export const ClassSubject =
  mongoose.models.ClassSubject ||
  mongoose.model<IClassSubject>("ClassSubject", ClassSubjectSchema);
