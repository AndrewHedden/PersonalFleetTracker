// SST writes the full Resource declarations to /sst-env.d.ts (root) on each
// deploy, but module augmentation through the per-workspace forwarder file
// doesn't reliably merge with the `sst` package's empty `Resource` interface.
// This local d.ts re-declares only the resources `@pft/web` actually consumes,
// so TS picks them up unconditionally.
//
// Keep this in sync with the resources `infra/src/web.ts` links to.

declare module 'sst' {
  export interface Resource {
    Api: {
      type: 'sst.aws.ApiGatewayV2';
      url: string;
    };
    UserPool: {
      type: 'sst.aws.CognitoUserPool';
      id: string;
    };
    AppClient: {
      type: 'sst.aws.CognitoUserPoolClient';
      id: string;
      secret: string;
    };
  }
}

export {};
