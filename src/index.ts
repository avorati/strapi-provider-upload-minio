import { Client } from "minio";
import { MinIOConfig, StrapiFile, UploadOptions } from "./index.types";
import { ReadStream } from "node:fs";
const mime = require("mime-types");

export function init(config: MinIOConfig) {
  // Validação de configuração com mensagens específicas
  if (!config.endPoint) throw new Error("MinIO provider requires endPoint");
  if (!config.accessKey) throw new Error("MinIO provider requires accessKey");
  if (!config.secretKey) throw new Error("MinIO provider requires secretKey");
  if (!config.bucket) throw new Error("MinIO provider requires bucket");

  // Inicialização do cliente MinIO
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
    `${config.useSSL ? "https" : "http"}://${config.endPoint}${
      config.port && config.port !== (config.useSSL ? 443 : 80)
        ? `:${config.port}`
        : ""
    }`;

  // Cache para verificar existência do bucket
  let bucketExistsCache: boolean | null = null;

  // Gera o caminho do arquivo no bucket
  const getKey = (file: StrapiFile): string => {
    const pathChunk = ""; // Strapi v5 não usa 'path'
    const path = folder ? `${folder}/${pathChunk}` : pathChunk;
    return `${path}${file.hash}${file.ext}`;
  };

  // Gera a URL pública do arquivo
  const getUrl = (key: string): string => {
    return `${baseUrl}/${bucket}/${key}`;
  };

  // Garante que o bucket existe e está configurado
  const ensureBucket = async (isPrivate: boolean = false): Promise<void> => {
    if (bucketExistsCache === null) {
      const exists = await client.bucketExists(bucket);
      if (!exists) {
        await client.makeBucket(bucket, config.region || "us-east-1");
        if (!isPrivate) {
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
      bucketExistsCache = true;
    }
  };

  return {
    // Faz upload do arquivo para o MinIO
    async upload(file: StrapiFile, options: UploadOptions = {}): Promise<void> {
      const key = getKey(file);

      try {
        await ensureBucket(options.isPrivate);

        const metadata = {
          "Content-Type": mime.lookup(file.ext) || "application/octet-stream",
        };

        const uploadData: ReadStream | Buffer | undefined =
          file.stream || file.buffer;
        if (!uploadData) {
          throw new Error("File must have either stream or buffer");
        }

        // Valida o tamanho para streams
        if (file.stream && typeof file.size !== "number") {
          throw new Error("File size must be provided for stream uploads");
        }

        const uploadSize: number = file.buffer ? file.buffer.length : file.size;

        // Tratamento de erro para streams
        if (file.stream) {
          file.stream.on("error", (err) => {
            console.error("Stream error during upload:", err);
          });
        }

        const uploadResult = await client.putObject(
          bucket,
          key,
          uploadData,
          uploadSize,
          metadata
        );

        file.url = options.isPrivate ? undefined : getUrl(key);
        file.provider_metadata = {
          key,
          bucket,
          region: config.region,
          etag:
            typeof uploadResult === "string"
              ? uploadResult
              : uploadResult?.etag,
        };
      } catch (error) {
        let message = "MinIO upload failed";
        if (error && typeof error === "object" && "message" in error) {
          message += `: ${(error as any).message}`;
        }
        throw new Error(message);
      }
    },

    // Faz upload de streams (reutiliza a função upload)
    async uploadStream(
      file: StrapiFile,
      options: UploadOptions = {}
    ): Promise<void> {
      return this.upload(file, options);
    },

    // Remove o arquivo do bucket
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

    // Verifica o tamanho do arquivo
    async checkFileSize(
      file: StrapiFile,
      { sizeLimit }: { sizeLimit: number }
    ): Promise<void> {
      if (file.size > sizeLimit) {
        throw new Error(`File size exceeds limit of ${sizeLimit} bytes`);
      }
    },

    // Gera uma URL assinada para acesso temporário
    async getSignedUrl(
      file: StrapiFile,
      options: { expiresIn?: number } = {}
    ): Promise<string> {
      const key = file.provider_metadata?.key || getKey(file);
      const expiry = options.expiresIn || 3600;
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

    // Define se o bucket é privado (padrão: false)
    async isPrivate(): Promise<boolean> {
      return false;
    },
  };
}
