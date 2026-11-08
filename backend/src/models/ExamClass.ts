import mongoose, { Schema, Document } from "mongoose";

export interface IExamClass extends Document {
  id: string;
  examId: string;
  classId: string;
  createdAt: Date;
}

const ExamClassSchema = new Schema<IExamClass>(
  {
    examId: { type: String, required: true, ref: "Exam", index: true },
    classId: { type: String, required: true, ref: "SchoolClass" },
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

ExamClassSchema.index({ examId: 1, classId: 1 }, { unique: true });

export const ExamClass =
  mongoose.models.ExamClass || mongoose.model<IExamClass>("ExamClass", ExamClassSchema);
