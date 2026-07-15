/**
 * Cloudinary URL utilities for optimizing image delivery.
 *
 * Usage:
 *   import { optimizeImage } from '../src/utils/cloudinary';
 *   <Image source={{ uri: optimizeImage(photoUrl, 400) }} />
 */

import { CLOUDINARY } from '../api/config';

const CLOUD_NAME = CLOUDINARY.CLOUD_NAME;

export function optimizeImage(
  url: string | null | undefined,
  width = 600,
  quality: 'auto' | 'good' | 'best' = 'good',
): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;

  const transformations = `w_${width},f_auto,q_auto:${quality}`;
  return url.replace(`/image/upload/`, `/image/upload/${transformations}/`);
}

export function optimizeVideo(
  url: string | null | undefined,
  quality: 'auto' | 'good' | 'best' = 'auto',
): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;

  const transformations = `f_auto,q_${quality}`;
  return url.replace(`/video/upload/`, `/video/upload/${transformations}/`);
}
