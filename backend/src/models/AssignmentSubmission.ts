import mongoose, { Schema, Document } from "mongoose";

export interface IAssignmentSubmission extends Document {
  id: string;
  assignmentId: string;
  studentId: string;
  content?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  marks?: number | null;
  grade?: string | null;
  teacherRemarks?: string | null;
  submittedAt?: Date | null;
  gradedAt?: Date | null;
  status: "PENDING" | "SUBMITTED" | "GRADED" | "LATE";
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignmentId: { type: String, required: true, ref: "Assignment", index: true },
    studentId: { type: String, required: true, ref: "StudentProfile", index: true },
    content: { type: String, default: null },
    attachmentName: { type: String, default: null },
    attachmentUrl: { type: String, default: null },
    marks: { type: Number, default: null },
    grade: { type: String, default: null },
    teacherRemarks: { type: String, default: null },
    submittedAt: { type: Date, default: null },
    gradedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ["PENDING", "SUBMITTED", "GRADED", "LATE"],
      default: "PENDING",
    },
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

AssignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

export const AssignmentSubmission =
  mongoose.models.AssignmentSubmission ||
  mongoose.model<IAssignmentSubmission>("AssignmentSubmission", AssignmentSubmissionSchema);
