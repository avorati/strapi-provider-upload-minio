import { Client } from "minio";
import { MinIOConfig, StrapiFile, UploadOptions } from "./index.types";
import mime from "mime-types";

// Cache global para buckets verificados
const bucketCache = new Set<string>();

// Type guard para erros do MinIO
function isMinioError(error: unknown): error is { code: string; message: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export function init(config: MinIOConfig) {
  // Validação rigorosa da configuração
  const requiredConfig = [
    "endPoint",
    "accessKey",
    "secretKey",
    "bucket"
  ];

  const missingConfig = requiredConfig.filter(key => !(key in config));
  
  if (missingConfig.length > 0) {
    throw new Error(
      `MinIO provider missing required configuration: ${missingConfig.join(", ")}`
    );
  }

  // Configuração simplificada da porta
  const port = config.port ?? (config.useSSL ? 443 : 80);

  // Inicialização do cliente MinIO
  const client = new Client({
    endPoint: config.endPoint,
    port: port,
    useSSL: config.useSSL ?? false,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region || "us-east-1",
  });

  const { bucket } = config;
  const folder = config.folder || "";
  
  // Construção da URL base
  const shouldIncludePort = port && port !== (config.useSSL ? 443 : 80);
  const baseUrl = config.baseUrl || 
    `${config.useSSL ? "https" : "http"}://${config.endPoint}${shouldIncludePort ? `:${port}` : ""}`;

  // Geração do caminho do arquivo
  const getKey = (file: StrapiFile): string => {
    const pathChunk = "";
    const path = folder ? `${folder}/${pathChunk}` : pathChunk;
    return `${path}${file.hash}${file.ext}`.replace(/\/\//g, "/");
  };

  // Geração da URL pública
  const getUrl = (key: string): string => {
    return `${baseUrl}/${bucket}/${key}`;
  };

  // Verificação e criação do bucket com cache
  const ensureBucket = async (isPrivate: boolean = false): Promise<void> => {
    if (bucketCache.has(bucket)) return;

    try {
      const bucketExists = await client.bucketExists(bucket);
      
      if (!bucketExists) {
        await client.makeBucket(bucket, config.region || "us-east-1");

        // Aplicar política pública se necessário
        if (!isPrivate && config.publicPolicy !== false) {
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
      
      bucketCache.add(bucket);
    } catch (error) {
      let message = "Bucket verification failed";
      
      if (isMinioError(error)) {
        message += ` [${error.code}]: ${error.message}`;
      } else if (error instanceof Error) {
        message += `: ${error.message}`;
      }
      
      throw new Error(message);
    }
  };

  return {
    async upload(file: StrapiFile, options: UploadOptions = {}): Promise<void> {
      // Validação do arquivo
      if (!file.stream && !file.buffer) {
        throw new Error("File must have either stream or buffer");
      }
      
      if (file.stream && !file.size) {
        throw new Error("File size is required for stream uploads");
      }

      const key = getKey(file);

      try {
        await ensureBucket(options.isPrivate);

        // Metadados aprimorados
        const metadata = {
          "Content-Type": mime.lookup(file.ext) || "application/octet-stream",
          "Original-Filename": encodeURIComponent(file.name),
          ...(file.metadata || {}),
        };

        // Determinar conteúdo e tamanho
        const uploadData = file.stream || file.buffer!;
        const uploadSize = file.buffer ? file.buffer.length : file.size!;

        // Handler de erro para streams
        if (file.stream) {
          file.stream.on("error", (err) => {
            console.error("Stream error during upload:", err);
          });
        }

        // Upload para o MinIO
        const uploadResult = await client.putObject(
          bucket,
          key,
          uploadData,
          uploadSize,
          metadata
        );

        // Atualizar metadados do arquivo
        file.url = options.isPrivate ? undefined : getUrl(key);
        file.provider_metadata = {
          ...(file.provider_metadata || {}),
          key,
          bucket,
          region: config.region,
          etag: uploadResult.etag,
          versionId: uploadResult.versionId || null,
        };
      } catch (error) {
        let message = `Upload failed for ${file.name || 'unknown file'}`;
        
        if (isMinioError(error)) {
          message += ` [${error.code}]: ${error.message}`;
        } else if (error instanceof Error) {
          message += `: ${error.message}`;
        }
        
        throw new Error(message);
      }
    },

    async uploadStream(
      file: StrapiFile,
      options: UploadOptions = {}
    ): Promise<void> {
      return this.upload(file, options);
    },

    async delete(file: StrapiFile): Promise<void> {
      const key = file.provider_metadata?.key || getKey(file);

      try {
        await client.removeObject(bucket, key);
        
        // Limpar metadados
        if (file.provider_metadata) {
          file.provider_metadata.key = '';
          file.url = '';
        }
      } catch (error) {
        let message = `Delete failed for ${file.name || 'unknown file'}`;
        
        if (isMinioError(error)) {
          message += ` [${error.code}]: ${error.message}`;
        } else if (error instanceof Error) {
          message += `: ${error.message}`;
        }
        
        throw new Error(message);
      }
    },

    async checkFileSize(
      file: StrapiFile,
      { sizeLimit }: { sizeLimit: number }
    ): Promise<void> {
      if (!file.size) {
        throw new Error("File size is unknown");
      }
      
      if (file.size > sizeLimit) {
        throw new Error(
          `File size (${file.size} bytes) exceeds limit of ${sizeLimit} bytes`
        );
      }
    },

    async getSignedUrl(
      file: StrapiFile,
      options: { expiresIn?: number } = {}
    ): Promise<string> {
      const key = file.provider_metadata?.key || getKey(file);
      const expiry = options.expiresIn || 3600; // 1 hora padrão

      try {
        return await client.presignedGetObject(bucket, key, expiry);
      } catch (error) {
        let message = "Signed URL generation failed";
        
        if (isMinioError(error)) {
          message += ` [${error.code}]: ${error.message}`;
        } else if (error instanceof Error) {
          message += `: ${error.message}`;
        }
        
        throw new Error(message);
      }
    },

    async healthCheck(): Promise<{ status: boolean; message?: string }> {
      try {
        await client.listBuckets();
        return { status: true };
      } catch (error) {
        let message = "MinIO connection failed";
        
        if (isMinioError(error)) {
          message += ` [${error.code}]: ${error.message}`;
        } else if (error instanceof Error) {
          message += `: ${error.message}`;
        }
        
        return { status: false, message };
      }
    },

    async isPrivate(): Promise<boolean> {
      return config.publicPolicy === false;
    },
  };
}