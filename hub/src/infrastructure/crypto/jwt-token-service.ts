import jwt, { SignOptions } from "jsonwebtoken";
import { TokenPayload, TokenService } from "../../application/ports/token-service";

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string | number,
  ) {}

  sign(payload: TokenPayload): string {
    const options = { expiresIn: this.expiresIn } as SignOptions;
    return jwt.sign(payload, this.secret, options);
  }
}
