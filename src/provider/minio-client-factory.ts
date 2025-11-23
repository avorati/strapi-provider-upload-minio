import { Client as MinioClient } from "minio";
import { NormalizedConfig } from "../utils/config-validator";

/**
 * Creates a MinIO client instance from configuration
 */
export function createMinioClient(config: NormalizedConfig): MinioClient {
  return new MinioClient({
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
}

