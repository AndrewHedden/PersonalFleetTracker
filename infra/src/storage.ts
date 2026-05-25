/// <reference path="../../.sst/platform/config.d.ts" />

/**
 * Networking + database.
 *
 * Cost posture: NO NAT Gateway. We avoid it by:
 *   - Putting Lambda + RDS in the same VPC so DB traffic stays internal.
 *   - Using API Gateway JWT authorizers (Cognito) so Lambdas never need to
 *     hit cognito-idp.* over the internet to verify tokens.
 *   - Skipping any other outbound HTTPS from Lambda. If we ever need outbound
 *     internet, prefer adding the specific VPC interface endpoint (~$7/mo)
 *     over a NAT Gateway (~$32/mo).
 */
export const vpc = new sst.aws.Vpc('Vpc', {
  // Two AZs so RDS has the required >=2 subnets to live in even though
  // we're running single-AZ. No NAT (default).
  az: 2,
});

export const db = new sst.aws.Postgres('Db', {
  vpc,
  database: 'pft',
  version: '16.4',
  instance: 't4g.micro',
  storage: '20 GB',
  // Single-AZ to stay inside the RDS free tier (12-month).
  // Free tier covers db.t4g.micro single-AZ with 20 GB gp2 storage.
});
