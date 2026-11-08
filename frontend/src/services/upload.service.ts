import apiClient from '@/lib/axios';

export interface UploadResult {
  fileUrl: string;
  filename: string;
  originalFilename: string;
  provider?: 'cloudinary' | 'imagekit' | 'local';
}

/**
 * Upload a file to Cloudinary / ImageKit via backend
 */
export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<{ success: boolean; data: UploadResult }>('/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data;
}

