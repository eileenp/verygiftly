export type TokenResponse = {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export type SessionPayload = {
  unionId: string;
  clientId: string;
};

export type UserProfile = {
  sub: string;
  name: string;
  picture: string;
  email: string;
  email_verified?: boolean;
};
