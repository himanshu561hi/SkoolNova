import mongoose from 'mongoose';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';
import { Inquiry } from '../../models/index.js';
import type {
  CreateInquiryInput,
  ReplyInquiryInput,
  UpdateInquiryStatusInput,
  ListInquiriesQuery,
} from './inquiries.schema.js';

export class InquiriesService {
  /**
   * Submit an inquiry from website (public)
   */
  async createInquiry(input: CreateInquiryInput) {
    const inquiry = await Inquiry.create({
      name: input.name,
      schoolName: input.schoolName,
      email: input.email,
      phone: input.phone || null,
      studentCount: input.studentCount || null,
      message: input.message || null,
      status: 'NEW',
    });

    return inquiry.toJSON();
  }

  /**
   * List inquiries with filters & stats (Super Admin)
   */
  async listInquiries(query: ListInquiriesQuery) {
    const { status, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { schoolName: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [inquiries, total, newCount, repliedCount] = await Promise.all([
      Inquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Inquiry.countDocuments(filter),
      Inquiry.countDocuments({ status: 'NEW' }),
      Inquiry.countDocuments({ status: 'REPLIED' }),
    ]);

    return {
      inquiries: inquiries.map((i) => i.toJSON()),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        total,
        new: newCount,
        replied: repliedCount,
      },
    };
  }

  /**
   * Get single inquiry
   */
  async getInquiryById(id: string) {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Inquiry not found', HTTP_STATUS.NOT_FOUND, 'INQUIRY_NOT_FOUND');
    }
    const inquiry = await Inquiry.findById(id);

    if (!inquiry) {
      throw new AppError('Inquiry not found', HTTP_STATUS.NOT_FOUND, 'INQUIRY_NOT_FOUND');
    }

    return inquiry;
  }

  /**
   * Reply to inquiry and record response (Super Admin)
   */
  async replyToInquiry(id: string, input: ReplyInquiryInput, repliedBy: string) {
    const inquiry = await this.getInquiryById(id);

    inquiry.replyMessage = input.replyMessage;
    inquiry.status = input.status || 'REPLIED';
    inquiry.repliedAt = new Date();
    inquiry.repliedBy = repliedBy;
    await inquiry.save();

    return inquiry.toJSON();
  }

  /**
   * Update status directly (Super Admin)
   */
  async updateStatus(id: string, input: UpdateInquiryStatusInput) {
    const inquiry = await this.getInquiryById(id);
    inquiry.status = input.status;
    await inquiry.save();

    return inquiry.toJSON();
  }

  /**
   * Delete an inquiry (Super Admin)
   */
  async deleteInquiry(id: string) {
    await this.getInquiryById(id);
    await Inquiry.findByIdAndDelete(id);

    return { id, deleted: true };
  }
}

export const inquiriesService = new InquiriesService();
