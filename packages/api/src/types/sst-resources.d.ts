// SST writes the full Resource declarations to /sst-env.d.ts (root) on each
// deploy, but module augmentation through the per-workspace forwarder file
// doesn't reliably merge with the `sst` package's empty `Resource` interface.
// This local d.ts re-declares only the resources `@stablebook/api` actually
// consumes, so TS picks them up unconditionally.
//
// Keep in sync with the linked resources in `infra/src/api.ts` (and friends).

declare module 'sst' {
  export interface Resource {
    Db: {
      type: 'sst.aws.Postgres';
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    };
  }
}

export {};
