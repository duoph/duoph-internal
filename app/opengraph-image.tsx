import { generateSocialImage, socialImageAlt, socialImageSize, socialImageType } from "@/lib/social-image";

export const alt = socialImageAlt;
export const size = socialImageSize;
export const contentType = socialImageType;

export default function OpenGraphImage() {
  return generateSocialImage();
}
