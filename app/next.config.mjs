/** Server-rendered so /api/data can read app/data at runtime. */
const nextConfig = { images: { unoptimized: true }, trailingSlash: true, poweredByHeader: false,
  // /api/data reads app/data at runtime, so the JSON must ship with the serverless function.
  outputFileTracingIncludes: { "/api/data/[...path]": ["./data/**/*"] } };
export default nextConfig;
