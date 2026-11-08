import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  id: string;
  tenantId?: string | null;
  title: string;
  message: string;
  type: string;
  targetRole: string;
  targetClassId?: string | null;
  targetUserId?: string | null;
  link?: string | null;
  creatorId?: string | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    tenantId: { type: String, default: null, ref: "Tenant", index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "general" },
    targetRole: { type: String, default: "ALL", index: true },
    targetClassId: { type: String, default: null },
    targetUserId: { type: String, default: null, index: true },
    link: { type: String, default: null },
    creatorId: { type: String, default: null },
    isRead: { type: Boolean, default: false, index: true },
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

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
