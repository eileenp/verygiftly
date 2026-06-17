function getVar(name: string): string {
  const value = typeof process !== "undefined" ? process.env[name] : undefined;
  return value ?? "";
}

function required(name: string): string {
  const value = getVar(name);
  if (!value && getVar("NODE_ENV") === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get clientId() { return required("AUTH0_CLIENT_ID"); },
  get clientSecret() { return required("AUTH0_CLIENT_SECRET"); },
  get auth0Domain() { return required("AUTH0_DOMAIN"); },
  get isProduction() { return getVar("NODE_ENV") === "production"; },
  get databaseUrl() { return required("DATABASE_URL"); },
  get ownerUnionId() { return getVar("OWNER_UNION_ID"); },
  // Dedicated key for signing session JWTs. Falls back to the Auth0 client secret
  // for backward compatibility, but set SESSION_SECRET so the two trust domains
  // don't share a key (rotating one shouldn't compromise the other).
  get sessionSecret() { return getVar("SESSION_SECRET") || required("AUTH0_CLIENT_SECRET"); },
};
