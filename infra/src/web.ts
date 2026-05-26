/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * Next.js site — currently disabled in `sst.config.ts`.
 *
 * Why disabled (2026-05-25): SST's `Nextjs` construct uses OpenNext to
 * bundle the app for Lambda + CloudFront. OpenNext's
 * image-optimization-function contains an HTML-entities table with
 * duplicate keys, which esbuild surfaces as a warning. On Next.js 16 the
 * warning object is large enough that Node's `util.inspect` throws
 * `RangeError: Invalid string length` while Pulumi is formatting the
 * deploy diagnostics, which fails the entire `sst deploy`.
 *
 * Until OpenNext ships a fix (or we downgrade Next.js), the web app is
 * hosted out-of-band — the AWS-native option is **AWS Amplify Hosting**
 * pointed at the `web/` subdirectory of this monorepo, with build
 * settings that run `pnpm install && pnpm --filter @pft/web build`.
 *
 * Re-enable by importing this module from `sst.config.ts > run()` and
 * adding `web: web.url` back to its return value.
 */
import { api } from './api';
import { userPool, userPoolClient } from './auth';

export const web = new sst.aws.Nextjs('Web', {
  path: 'web',
  link: [api, userPool, userPoolClient],
  environment: {
    NEXT_PUBLIC_AWS_REGION: aws.getRegionOutput().name,
  },
});
