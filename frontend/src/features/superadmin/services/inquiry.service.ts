import apiClient from '@/lib/axios';

export interface Inquiry {
  id: string;
  name: string;
  schoolName: string;
  email: string;
  phone?: string | null;
  studentCount?: string | null;
  message?: string | null;
  status: 'NEW' | 'IN_PROGRESS' | 'REPLIED' | 'RESOLVED';
  replyMessage?: string | null;
  repliedAt?: string | null;
  repliedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InquiriesResponse {
  inquiries: Inquiry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    total: number;
    new: number;
    replied: number;
  };
}

export interface CreateInquiryPayload {
  name: string;
  schoolName: string;
  email: string;
  phone?: string;
  studentCount?: string;
  message?: string;
}

/**
 * Public: Submit inquiry from website
 */
export async function submitInquiry(payload: CreateInquiryPayload): Promise<Inquiry> {
  const response = await apiClient.post<{ success: boolean; data: Inquiry }>('/inquiries', payload);
  return response.data.data;
}

/**
 * Super Admin: Get all inquiries with filters & search
 */
export async function getInquiries(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<InquiriesResponse> {
  const response = await apiClient.get<{ success: boolean; data: InquiriesResponse }>('/inquiries', {
    params,
  });
  return response.data.data;
}

/**
 * Super Admin: Reply to inquiry
 */
export async function replyToInquiry(id: string, replyMessage: string): Promise<Inquiry> {
  const response = await apiClient.patch<{ success: boolean; data: Inquiry }>(`/inquiries/${id}/reply`, {
    replyMessage,
    status: 'REPLIED',
  });
  return response.data.data;
}

/**
 * Super Admin: Update inquiry status
 */
export async function updateInquiryStatus(id: string, status: Inquiry['status']): Promise<Inquiry> {
  const response = await apiClient.patch<{ success: boolean; data: Inquiry }>(`/inquiries/${id}/status`, {
    status,
  });
  return response.data.data;
}

/**
 * Super Admin: Delete inquiry
 */
export async function deleteInquiry(id: string): Promise<void> {
  await apiClient.delete(`/inquiries/${id}`);
}

