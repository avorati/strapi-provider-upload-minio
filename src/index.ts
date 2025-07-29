import { Client } from "minio";
import { MinIOConfig, StrapiFile, UploadOptions } from "./index.types";

export function init(config: MinIOConfig) {
  // Configuration validation
  if (
    !config.endPoint ||
    !config.accessKey ||
    !config.secretKey ||
    !config.bucket
  ) {
    throw new Error(
      "MinIO provider requires endPoint, accessKey, secretKey, and bucket",
    );
  }

  // Initialize MinIO client
  const client = new Client({
    endPoint: config.endPoint,
    port: config.port || (config.useSSL ? 443 : 80),
    useSSL: config.useSSL || false,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region || "us-east-1",
  });

  const bucket = config.bucket;
  const folder = config.folder || "";
  const baseUrl =
    config.baseUrl ||
    `${config.useSSL ? "https" : "http"}://${config.endPoint}${config.port && config.port !== (config.useSSL ? 443 : 80) ? `:${config.port}` : ""}`;

  // Function to generate file path
  const getKey = (file: StrapiFile): string => {
    const path = folder ? `${folder.replace(/\/$/, "")}/` : "";
    return `${path}${file.hash}${file.ext}`;
  };

  // Function to generate public URL
  const getUrl = (key: string): string => {
    return `${baseUrl}/${bucket}/${key}`;
  };

  return {
    async upload(file: StrapiFile, options: UploadOptions = {}): Promise<void> {
      const key = getKey(file);

      try {
        // Check if bucket exists, create if not
        const bucketExists = await client.bucketExists(bucket);
        if (!bucketExists) {
          await client.makeBucket(bucket, config.region || "us-east-1");

          // Set public policy if not private
          if (!options.isPrivate) {
            const policy = {
              Version: "2012-10-17",
              Statement: [
                {
                  Effect: "Allow",
                  Principal: { AWS: "*" },
                  Action: ["s3:GetObject"],
                  Resource: [`arn:aws:s3:::${bucket}/*`],
                },
              ],
            };
            await client.setBucketPolicy(bucket, JSON.stringify(policy));
          }
        }

        // Prepare metadata
        const metadata = {
          "Content-Type": file.mime,
          "Content-Disposition": `inline; filename="${file.name}"`,
          "Cache-Control": "max-age=31536000",
          ...(file.alternativeText && {
            "x-amz-meta-alt-text": file.alternativeText,
          }),
          ...(file.caption && { "x-amz-meta-caption": file.caption }),
        };

        // File upload
        let uploadResult;
        if (file.stream) {
          uploadResult = await client.putObject(
            bucket,
            key,
            file.stream,
            file.size,
            metadata,
          );
          if (typeof file.stream.close === "function") {
            file.stream.close();
          }
        } else if (file.buffer) {
          uploadResult = await client.putObject(
            bucket,
            key,
            file.buffer,
            file.size,
            metadata,
          );
        } else {
          throw new Error("File must have either stream or buffer");
        }

        // Update file information
        file.url = options.isPrivate ? undefined : getUrl(key);
        file.provider_metadata = {
          key,
          bucket,
          region: config.region,
          etag: uploadResult.etag,
        };
      } catch (error) {
        let message = "MinIO upload failed";
        if (error && typeof error === "object" && "message" in error) {
          message += `: ${(error as any).message}`;
        }
        throw new Error(message);
      }
    },

    async uploadStream(
      file: StrapiFile,
      options: UploadOptions = {},
    ): Promise<void> {
      return this.upload(file, options);
    },

    async delete(file: StrapiFile): Promise<void> {
      const key = file.provider_metadata?.key || getKey(file);

      try {
        await client.removeObject(bucket, key);
      } catch (error) {
        let message = "MinIO delete failed";
        if (error && typeof error === "object" && "message" in error) {
          message += `: ${(error as any).message}`;
        }
        throw new Error(message);
      }
    },

    async checkFileSize(
      file: StrapiFile,
      { sizeLimit }: { sizeLimit: number },
    ): Promise<void> {
      if (file.size > sizeLimit) {
        throw new Error(`File size exceeds limit of ${sizeLimit} bytes`);
      }
    },

    async getSignedUrl(
      file: StrapiFile,
      options: { expiresIn?: number } = {},
    ): Promise<string> {
      const key = file.provider_metadata?.key || getKey(file);
      const expiry = options.expiresIn || 3600; // 1 hour by default

      try {
        return await client.presignedGetObject(bucket, key, expiry);
      } catch (error) {
        let message = "MinIO signed URL generation failed";
        if (error && typeof error === "object" && "message" in error) {
          message += `: ${(error as any).message}`;
        }
        throw new Error(message);
      }
    },

    async isPrivate(): Promise<boolean> {
      return false; // By default, files are public
    },
  };
}
