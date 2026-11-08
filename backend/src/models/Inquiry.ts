import mongoose, { Schema, Document } from "mongoose";

export interface IInquiry extends Document {
  id: string;
  name: string;
  schoolName: string;
  email: string;
  phone?: string;
  studentCount?: string;
  message?: string;
  status: "NEW" | "CONTACTED" | "REPLIED" | "RESOLVED";
  replyMessage?: string;
  repliedBy?: string;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    name: { type: String, required: true, trim: true },
    schoolName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    studentCount: { type: String, trim: true },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "REPLIED", "RESOLVED"],
      default: "NEW",
      index: true,
    },
    replyMessage: { type: String },
    repliedBy: { type: String },
    repliedAt: { type: Date },
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

export const Inquiry = mongoose.models.Inquiry || mongoose.model<IInquiry>("Inquiry", InquirySchema);
