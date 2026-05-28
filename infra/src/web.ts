/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * Next.js site — DISABLED. We deploy via AWS Amplify Hosting now.
 *
 * Why disabled (2026-05-28): OpenNext + Lambda Function URL exhibited
 * several un-resolvable cookie / session quirks:
 *
 *   - Multi-Set-Cookie headers > 2 silently stripped between Lambda and
 *     the browser (callback couldn't ship 3 session cookies)
 *   - React/Next 16 fetch with `credentials: 'same-origin'` didn't carry
 *     cookies on form POSTs through CloudFront
 *   - RSC navigation `<Link>` clicks lost cookies on the RSC fetch, so
 *     edge-middleware/proxy auth checks 307'd authenticated users
 *
 * Amplify Hosting uses AWS's own Next.js runtime (not OpenNext) and
 * handles these patterns natively. The repo's `amplify.yml` (root)
 * defines the monorepo + pnpm build settings.
 *
 * To re-enable SST-managed hosting later: import this module from
 * `sst.config.ts > run()`, add `web: web.url` to outputs, and rebuild
 * the OpenNext path.
 */
import { api } from './api';
import { userPool, userPoolClient } from './auth';

export const web = new sst.aws.Nextjs('Web', {
  path: 'web',
  link: [api, userPool, userPoolClient],
  environment: {
    NEXT_PUBLIC_AWS_REGION: aws.getRegionOutput().name,
    COGNITO_DOMAIN_URL: userPool.domainUrl,
  },
});
