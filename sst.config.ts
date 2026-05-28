/// <reference path="./.sst/platform/config.d.ts" />

/**
 * Stablebook — SST app definition.
 *
 * Stages:
 *   - personal stages (e.g. `andrew`) for day-to-day dev
 *   - `production` for the deployed portfolio environment
 *
 * Removal posture:
 *   - production: `retain` so an accidental `sst remove` can't drop the RDS data.
 *   - everything else: `remove` so dev stacks tear down cleanly.
 */
export default $config({
  app(input) {
    return {
      name: 'stablebook',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
      providers: {
        aws: { region: 'us-east-1' },
      },
    };
  },
  async run() {
    const { api } = await import('./infra/src/api');
    const { userPool, userPoolClient } = await import('./infra/src/auth');
    const { db } = await import('./infra/src/storage');
    const { migrator } = await import('./infra/src/migrator');
    // Web hosting moved off SST/OpenNext: see `infra/src/web.ts` for the
    // disabled `sst.aws.Nextjs` construct. We now use AWS Amplify Hosting
    // (configured in the AWS Amplify Console, connected to the GitHub
    // repo). Reasons: OpenNext + Lambda Function URL had multiple cookie /
    // session quirks (multi-Set-Cookie header strip, RSC nav cookie loss,
    // server-action multipart cookie loss) that proved un-resolvable
    // cleanly. Amplify Hosting uses AWS's own Next.js runtime which
    // handles these patterns natively.

    return {
      api: api.url,
      userPoolId: userPool.id,
      userPoolClientId: userPoolClient.id,
      dbHost: db.host,
      migratorName: migrator.name,
    };
  },
});
