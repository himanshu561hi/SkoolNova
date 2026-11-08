import mongoose, { Schema, Document } from "mongoose";

export interface IExamSubject extends Document {
  id: string;
  examId: string;
  classId: string;
  className?: string;
  subjectName: string;
  date: Date;
  startTime: string;
  endTime: string;
  teacherId?: string | null;
  paperPdfUrl?: string | null;
  paperStatus: "PENDING" | "SUBMITTED" | "REVIEWED" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  marksUploaded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSubjectSchema = new Schema<IExamSubject>(
  {
    examId: { type: String, required: true, ref: "Exam", index: true },
    classId: { type: String, required: true, ref: "SchoolClass" },
    className: { type: String, trim: true },
    subjectName: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    teacherId: { type: String, ref: "TeacherProfile", default: null },
    paperPdfUrl: { type: String, default: null },
    paperStatus: {
      type: String,
      enum: ["PENDING", "SUBMITTED", "REVIEWED", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    rejectionReason: { type: String, default: null },
    marksUploaded: { type: Boolean, default: false },
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

export const ExamSubject =
  mongoose.models.ExamSubject || mongoose.model<IExamSubject>("ExamSubject", ExamSubjectSchema);
