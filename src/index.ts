import { ProviderOptions, StrapiProvider } from "./index.types";
import { validateAndNormalizeConfig } from "./utils/config-validator";
import { MinioProvider } from "./provider/minio-provider";

/**
 * Initializes the MinIO upload provider for Strapi
 */
const provider = {
  init(providerOptions: ProviderOptions): StrapiProvider {
    const config = validateAndNormalizeConfig(providerOptions);
    const minioProvider = new MinioProvider(config);
    
    // Return explicit object with methods bound to the instance
    // This ensures Strapi can properly access the methods
    return {
      upload: minioProvider.upload.bind(minioProvider),
      uploadStream: minioProvider.uploadStream.bind(minioProvider),
      delete: minioProvider.delete.bind(minioProvider),
      isPrivate: minioProvider.isPrivate.bind(minioProvider),
      getSignedUrl: minioProvider.getSignedUrl.bind(minioProvider),
    };
  },
};

// Export for CommonJS (required by Strapi)
// This must be the primary export for Strapi to work correctly
module.exports = provider;
