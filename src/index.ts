import { ProviderOptions, StrapiProvider } from "./index.types";
import { validateAndNormalizeConfig } from "./utils/config-validator";
import { MinioProvider } from "./provider/minio-provider";

/**
 * Initializes the MinIO upload provider for Strapi
 */
const provider = {
  init(providerOptions: ProviderOptions): StrapiProvider {
    const config = validateAndNormalizeConfig(providerOptions);
    return new MinioProvider(config);
  },
};

// Export for CommonJS (required by Strapi)
// This must be the primary export for Strapi to work correctly
module.exports = provider;
