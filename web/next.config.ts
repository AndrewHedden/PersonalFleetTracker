import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone output bundles the app entry + traced runtime deps into
  // `.next/standalone/`. Needed for AWS Amplify Hosting: with pnpm's
  // workspace layout (even with nodeLinker: hoisted), deps land at the
  // repo root's node_modules, not under web/node_modules where Amplify
  // looks. Standalone copies them into the artifact directory itself.
  output: 'standalone',
  // Trace from the monorepo root so @vercel/nft can follow workspace:*
  // imports like @stablebook/shared.
  outputFileTracingRoot: path.join(__dirname, '..'),
};

export default nextConfig;
