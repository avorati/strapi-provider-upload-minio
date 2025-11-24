import { Client as MinioClient } from "minio";
import http from "http";
import https from "https";
import { NormalizedConfig } from "../utils/config-validator";

/**
 * Creates a MinIO client instance from configuration
 */
export function createMinioClient(config: NormalizedConfig): MinioClient {
  const clientOptions: any = {
    endPoint: config.endPoint,
    port: config.port,
    useSSL: config.useSSL,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  };

  // Create custom HTTP agent with timeout options if provided
  const connectTimeout = config.connectTimeout || 60000; // Default 60 seconds

  const agentOptions = {
    keepAlive: true,
    keepAliveMsecs: 1000,
    timeout: connectTimeout,
  };

  if (config.useSSL) {
    clientOptions.transportAgent = new https.Agent(agentOptions);
  } else {
    clientOptions.transportAgent = new http.Agent(agentOptions);
  }

  // Log client creation in debug mode
  if (config.debug) {
    const logger = require('../utils/logger').getLogger();
    if (logger.isDebugEnabled && logger.isDebugEnabled()) {
      logger.debug(
        `[strapi-provider-upload-minio] [DEBUG] Creating MinIO client:`,
        JSON.stringify({
          endPoint: config.endPoint,
          port: config.port,
          useSSL: config.useSSL,
          accessKeyLength: config.accessKey?.length,
          secretKeyLength: config.secretKey?.length,
          accessKeyPrefix: config.accessKey?.substring(0, 8),
          connectTimeout,
          hasTransportAgent: !!clientOptions.transportAgent,
        }, null, 2)
      );
    }
  }

  return new MinioClient(clientOptions);
}

