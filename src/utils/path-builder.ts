import { StrapiFile } from "../index.types";

/**
 * Builds the upload path for a file in MinIO
 */
export function buildUploadPath(
  file: StrapiFile,
  folder: string
): string {
  const pathSegments: string[] = [];

  if (folder) {
    pathSegments.push(folder);
  }

  if (file.path) {
    pathSegments.push(file.path);
  }

  pathSegments.push(`${file.hash}${file.ext}`);

  return pathSegments.join("/");
}

/**
 * Extracts the file path from a MinIO URL
 */
export function extractFilePathFromUrl(
  url: string,
  hostUrl: string,
  bucket: string
): string {
  if (!url) {
    throw new Error("File URL is required for path extraction");
  }

  const bucketPrefix = `${hostUrl}${bucket}/`;
  return url.replace(bucketPrefix, "");
}

