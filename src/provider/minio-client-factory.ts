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
  const keepAlive = config.keepAlive !== undefined ? config.keepAlive : false; // Default: false to avoid proxy/firewall issues

  const agentOptions: https.AgentOptions | http.AgentOptions = {
    keepAlive: keepAlive,
    keepAliveMsecs: 1000,
    timeout: connectTimeout,
    maxSockets: 50, // Maximum number of sockets per host
    maxFreeSockets: 10, // Maximum number of free sockets per host
  };

  if (config.useSSL) {
    // Add SSL-specific options for HTTPS agent
    // rejectUnauthorized defaults to true (secure by default)
    // Set to false only for self-signed certificates in dev/hmg environments
    (agentOptions as https.AgentOptions).rejectUnauthorized = config.rejectUnauthorized;
    clientOptions.transportAgent = new https.Agent(agentOptions as https.AgentOptions);
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
          rejectUnauthorized: config.rejectUnauthorized,
          accessKeyLength: config.accessKey?.length,
          secretKeyLength: config.secretKey?.length,
          accessKeyPrefix: config.accessKey?.substring(0, 8),
          connectTimeout,
          keepAlive,
          maxSockets: 50,
          maxFreeSockets: 10,
          hasTransportAgent: !!clientOptions.transportAgent,
        }, null, 2)
      );
    }
  }

  return new MinioClient(clientOptions);
}

