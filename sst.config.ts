/// <reference path="./.sst/platform/config.d.ts" />

/**
 * PersonalFleetTracker — SST v3 app definition.
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
      name: 'personal-fleet-tracker',
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
    // Web is intentionally not deployed via SST yet. SST's `Nextjs` construct
    // uses OpenNext under the hood, and OpenNext currently crashes during the
    // Lambda bundle step on Next.js 16 (esbuild emits a duplicate-key warning
    // for OpenNext's image-optimization-function so large that Node's error
    // formatter throws `RangeError: Invalid string length`). Until OpenNext
    // catches up, the web app is hosted separately (e.g. AWS Amplify Hosting
    // from the same GitHub repo). See infra/src/web.ts for the disabled config.

    return {
      api: api.url,
      userPoolId: userPool.id,
      userPoolClientId: userPoolClient.id,
      dbHost: db.host,
      migratorName: migrator.name,
    };
  },
});
