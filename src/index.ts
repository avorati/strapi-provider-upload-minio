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

// Export for ES modules
export default provider;

// Export for CommonJS (required by Strapi)
// This ensures compatibility with both ES modules and CommonJS
module.exports = provider;
