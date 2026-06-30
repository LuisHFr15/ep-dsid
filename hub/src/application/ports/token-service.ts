export interface TokenPayload {
  sub: string;
  username: string;
}

export interface TokenService {
  sign(payload: TokenPayload): string;
}
