import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * Returns the authenticated user's Cognito claims.
 *
 * Phase 3 will swap this for a real `users` lookup: upsert by `cognito_sub`
 * on first sign-in, then return the joined user record. For now it proves
 * the JWT authorizer is wiring claims into the event.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyResultV2> => {
  const claims = event.requestContext.authorizer.jwt.claims;

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      cognitoSub: claims.sub,
      email: claims.email,
      tokenUse: claims.token_use,
    }),
  };
};
