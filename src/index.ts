import { ProviderOptions, StrapiProvider } from "./index.types";
import { validateAndNormalizeConfig } from "./utils/config-validator";
import { MinioProvider } from "./provider/minio-provider";

/**
 * Initializes the MinIO upload provider for Strapi
 */
export default {
  init(providerOptions: ProviderOptions): StrapiProvider {
    const config = validateAndNormalizeConfig(providerOptions);
    return new MinioProvider(config);
  },
};
