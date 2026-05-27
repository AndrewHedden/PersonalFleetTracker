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
    const { web } = await import('./infra/src/web');

    return {
      api: api.url,
      web: web.url,
      userPoolId: userPool.id,
      userPoolClientId: userPoolClient.id,
      dbHost: db.host,
      migratorName: migrator.name,
    };
  },
});
