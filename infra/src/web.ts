/// <reference path="../../.sst/platform/config.d.ts" />

import { api } from './api';
import { userPool, userPoolClient } from './auth';

/**
 * Next.js site, deployed to Lambda + CloudFront via SST's OpenNext integration.
 *
 * Linked resources are exposed to the app at runtime via `Resource.*` from
 * the `sst` package — no manual env-var wiring required.
 */
export const web = new sst.aws.Nextjs('Web', {
  path: 'web',
  link: [api, userPool, userPoolClient],
  environment: {
    NEXT_PUBLIC_AWS_REGION: aws.getRegionOutput().name,
  },
});
