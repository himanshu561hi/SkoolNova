import mongoose, { Schema, Document } from "mongoose";

export interface IExamMark extends Document {
  id: string;
  examSubjectId: string;
  studentId: string;
  marksObtained: number;
  maxMarks: number;
  gradedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExamMarkSchema = new Schema<IExamMark>(
  {
    examSubjectId: { type: String, required: true, ref: "ExamSubject", index: true },
    studentId: { type: String, required: true, ref: "StudentProfile", index: true },
    marksObtained: { type: Number, required: true },
    maxMarks: { type: Number, required: true, default: 100 },
    gradedBy: { type: String, default: null },
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

ExamMarkSchema.index({ examSubjectId: 1, studentId: 1 }, { unique: true });

export const ExamMark =
  mongoose.models.ExamMark || mongoose.model<IExamMark>("ExamMark", ExamMarkSchema);
