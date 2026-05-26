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
  transform: {
    instance: (args) => {
      // AWS's new credit-based Free Plan rejects RDS instances with any
      // automated backup retention (the previous 12-month free tier allowed
      // 7 days). Disable automated backups and skip the final snapshot so
      // `sst remove` can tear the DB down cleanly. We can take manual
      // snapshots before risky migrations if we need point-in-time recovery.
      args.backupRetentionPeriod = 0;
      args.skipFinalSnapshot = true;
      // Free Plan also disallows Enhanced Monitoring and Performance Insights.
      args.monitoringInterval = 0;
      args.performanceInsightsEnabled = false;
    },
  },
});
