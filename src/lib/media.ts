import path from "node:path";

export { MAX_IMAGE_BYTES } from "./photo-data";
export const mediaDirectory = () => path.resolve(process.env.MEDIA_DIR || "var/media");
export const mediaNamePattern = /^[a-f0-9-]{36}\.webp$/;
