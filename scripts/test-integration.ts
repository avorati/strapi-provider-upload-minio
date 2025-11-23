/**
 * Integration test script for MinIO provider
 * 
 * Usage:
 *   yarn test:integration
 * 
 * The script will automatically load variables from .env or .env.local file.
 * Or you can override with custom env vars:
 *   MINIO_ENDPOINT=localhost MINIO_PORT=9000 yarn test:integration
 */

// Load environment variables from .env file
import dotenv from "dotenv";
import { resolve } from "path";

// Try to load .env.local first, then .env
dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

import { Client as MinioClient } from "minio";
import defaultExport from "../src/index";
import { StrapiFile } from "../src/index.types";

const config = {
  endPoint: process.env.MINIO_ENDPOINT || process.env.MINIO_HOST || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
  bucket: process.env.MINIO_BUCKET || "strapi-boiler",
  folder: process.env.MINIO_FOLDER || "cms",
  private: process.env.MINIO_PRIVATE === "true",
  expiry: parseInt(process.env.MINIO_EXPIRY || "604800"),
};

async function ensureBucketExists(client: MinioClient, bucket: string) {
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    console.log(`Creating bucket: ${bucket}`);
    await client.makeBucket(bucket, "us-east-1");
    console.log(`Bucket ${bucket} created successfully`);
  } else {
    console.log(`Bucket ${bucket} already exists`);
  }
}

async function runTests() {
  console.log("🚀 Starting MinIO Integration Tests\n");
  console.log("Configuration:");
  console.log(`  Endpoint: ${config.endPoint}:${config.port}`);
  console.log(`  SSL: ${config.useSSL}`);
  console.log(`  Bucket: ${config.bucket}`);
  console.log(`  Folder: ${config.folder}`);
  console.log(`  Private: ${config.private}`);
  console.log(`  Expiry: ${config.expiry}s\n`);

  // Validate required config
  if (!config.accessKey || !config.secretKey) {
    console.error("❌ Error: MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required");
    console.error("\n💡 Tip: Create a .env file in the project root with your MinIO credentials.");
    console.error("   You can copy .env.example as a template:");
    console.error("   cp .env.example .env");
    console.error("\n   Or set them inline:");
    console.error("   PowerShell: $env:MINIO_ACCESS_KEY='xxx'; $env:MINIO_SECRET_KEY='yyy'; yarn test:integration");
    console.error("   Bash: MINIO_ACCESS_KEY=xxx MINIO_SECRET_KEY=yyy yarn test:integration");
    process.exit(1);
  }

  try {
    // Create MinIO client to check bucket
    const client = new MinioClient({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });

    // Ensure bucket exists
    await ensureBucketExists(client, config.bucket);

    // Initialize provider
    const provider = defaultExport.init(config);

    console.log("\n📦 Testing Public File Operations\n");

    // Test 1: Upload public file
    const publicFile: StrapiFile = {
      name: "test-public.txt",
      hash: `test-public-${Date.now()}`,
      ext: ".txt",
      mime: "text/plain",
      size: 1024,
      provider: "minio",
      buffer: Buffer.from("This is a test public file content"),
    };

    console.log("1. Uploading public file...");
    await provider.upload(publicFile);
    console.log(`   ✅ Uploaded: ${publicFile.url}`);

    // Test 2: Get signed URL for public file
    console.log("\n2. Generating signed URL for public file...");
    const publicSignedUrl = await provider.getSignedUrl(publicFile);
    console.log(`   ✅ Signed URL: ${publicSignedUrl.url.substring(0, 80)}...`);

    // Test 3: Get signed URL with custom expiry
    console.log("\n3. Generating signed URL with custom expiry (1 hour)...");
    const publicSignedUrlCustom = await provider.getSignedUrl(publicFile, {
      expiresIn: 3600,
    });
    console.log(
      `   ✅ Signed URL: ${publicSignedUrlCustom.url.substring(0, 80)}...`
    );

    // Test 4: Check isPrivate
    console.log("\n4. Checking isPrivate()...");
    console.log(`   ✅ isPrivate: ${provider.isPrivate()}`);

    // Test 5: Delete public file
    console.log("\n5. Deleting public file...");
    await provider.delete(publicFile);
    console.log("   ✅ File deleted successfully");

    console.log("\n🔒 Testing Private File Operations\n");

    // Initialize private provider
    const privateConfig = { ...config, private: true };
    const privateProvider = defaultExport.init(privateConfig);

    // Test 6: Upload private file
    const privateFile: StrapiFile = {
      name: "test-private.txt",
      hash: `test-private-${Date.now()}`,
      ext: ".txt",
      mime: "text/plain",
      size: 1024,
      provider: "minio",
      buffer: Buffer.from("This is a test private file content"),
    };

    console.log("6. Uploading private file...");
    await privateProvider.upload(privateFile);
    console.log(`   ✅ Uploaded: ${privateFile.url}`);

    // Test 7: Check isPrivate for private provider
    console.log("\n7. Checking isPrivate() for private provider...");
    console.log(`   ✅ isPrivate: ${privateProvider.isPrivate()}`);

    // Test 8: Get signed URL for private file
    console.log("\n8. Generating signed URL for private file...");
    const privateSignedUrl = await privateProvider.getSignedUrl(privateFile);
    console.log(`   ✅ Signed URL: ${privateSignedUrl.url.substring(0, 80)}...`);

    // Test 9: Get signed URL with custom expiry for private file
    console.log("\n9. Generating signed URL with custom expiry (30 min)...");
    const privateSignedUrlCustom = await privateProvider.getSignedUrl(
      privateFile,
      { expiresIn: 1800 }
    );
    console.log(
      `   ✅ Signed URL: ${privateSignedUrlCustom.url.substring(0, 80)}...`
    );

    // Test 10: Delete private file
    console.log("\n10. Deleting private file...");
    await privateProvider.delete(privateFile);
    console.log("   ✅ File deleted successfully");

    console.log("\n✅ All integration tests passed!");
  } catch (error) {
    console.error("\n❌ Integration test failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

runTests();

