import type { User } from '@prisma/client';
import { signedImageUrl } from '../../lib/cloudinary';

export function toUserDto(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    timeZone: user.timeZone,
    locale: user.locale,
    role: user.role,
    currentPetId: user.currentPetId,
    notifyEnabled: user.notifyEnabled,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt,
  };
}

export type UserDto = ReturnType<typeof toUserDto>;

/** URL ảnh đại diện có chữ ký (hoặc null). */
export const avatarUrlOf = (key: string | null) =>
  key ? { url: signedImageUrl(key, 'full'), thumbnailUrl: signedImageUrl(key, 'thumb') } : null;
