import { CLOUDINARY } from '../api/config';
import api from '../api/client';

type UploadType = 'image' | 'video';

interface UploadResult {
  secureUrl: string;
  publicId?: string;
}

async function getSignedUploadParams(): Promise<{
  signature: string;
  timestamp: number;
  apiKey: string;
} | null> {
  try {
    const result = await api.post<{
      signature: string;
      timestamp: number;
      apiKey: string;
    }>('/upload/sign-cloudinary', { type: 'image' });
    return result;
  } catch {
    return null;
  }
}

export async function uploadToCloudinary(
  uri: string,
  type: UploadType = 'image',
  options?: { publicId?: string; folder?: string },
): Promise<UploadResult> {
  const signedParams = await getSignedUploadParams();

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: type === 'image' ? 'image/jpeg' : 'video/mp4',
    name: `upload.${type === 'image' ? 'jpg' : 'mp4'}`,
  } as any);

  if (signedParams) {
    formData.append('signature', signedParams.signature);
    formData.append('timestamp', String(signedParams.timestamp));
    formData.append('api_key', signedParams.apiKey);
    if (options?.publicId) formData.append('public_id', options.publicId);
    if (options?.folder) formData.append('folder', options.folder);
  } else {
    formData.append('upload_preset', CLOUDINARY.UPLOAD_PRESET);
  }

  const endpoint =
    type === 'image'
      ? `https://api.cloudinary.com/v1_1/${CLOUDINARY.CLOUD_NAME}/image/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUDINARY.CLOUD_NAME}/video/upload`;

  const response = await fetch(endpoint, { method: 'POST', body: formData });
  const data = await response.json();

  if (!data.secure_url) {
    throw new Error(data?.error?.message || 'Cloudinary upload failed');
  }

  return { secureUrl: data.secure_url, publicId: data.public_id };
}

export async function uploadImage(uri: string, folder?: string): Promise<UploadResult> {
  return uploadToCloudinary(uri, 'image', { folder });
}

export async function uploadVideo(uri: string, folder?: string): Promise<UploadResult> {
  return uploadToCloudinary(uri, 'video', { folder });
}
