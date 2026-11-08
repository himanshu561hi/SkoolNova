import mongoose, { Schema, Document } from "mongoose";

export interface IExam extends Document {
  id: string;
  tenantId: string;
  title: string;
  name?: string;
  academicYear?: string;
  classes?: string[];
  startDate: Date;
  endDate: Date;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    title: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    academicYear: { type: String, trim: true, default: "2025-2026" },
    classes: { type: [String], default: [] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["UPCOMING", "ONGOING", "COMPLETED"],
      default: "UPCOMING",
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

ExamSchema.pre("save", function () {});

export const Exam = mongoose.models.Exam || mongoose.model<IExam>("Exam", ExamSchema);
