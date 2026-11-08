import mongoose, { Schema, Document } from "mongoose";

export interface ISchoolClass extends Document {
  id: string;
  tenantId: string;
  standard: string;
  section: string;
  name: string;
  classTeacherId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolClassSchema = new Schema<ISchoolClass>(
  {
    tenantId: { type: String, required: true, ref: "Tenant", index: true },
    standard: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, trim: true },
    classTeacherId: { type: String, ref: "TeacherProfile", default: null },
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

SchoolClassSchema.pre("save", function () {});

SchoolClassSchema.index({ tenantId: 1, standard: 1, section: 1 }, { unique: true });

export const SchoolClass =
  mongoose.models.SchoolClass || mongoose.model<ISchoolClass>("SchoolClass", SchoolClassSchema);
