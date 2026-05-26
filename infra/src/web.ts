/// <reference path="../../.sst/platform/config.d.ts" />

import { api } from './api';
import { userPool, userPoolClient } from './auth';

/**
 * Next.js site, deployed to Lambda + CloudFront via SST's OpenNext integration.
 *
 * Was disabled on SST 3.5.3 because OpenNext's image-optimization-function
 * triggered the same `RangeError: Invalid string length` in Pulumi's error
 * formatter as the Migrator Lambda. Re-enabled on SST 4.14.3 — the Pulumi
 * upgrade resolved the same class of crash for in-VPC Lambdas, so the OpenNext
 * path is worth retesting.
 *
 * Linked resources are exposed to the Next.js app at runtime via `Resource.*`
 * from the `sst` package — no manual env-var wiring required.
 */
export const web = new sst.aws.Nextjs('Web', {
  path: 'web',
  link: [api, userPool, userPoolClient],
  environment: {
    NEXT_PUBLIC_AWS_REGION: aws.getRegionOutput().name,
  },
});
