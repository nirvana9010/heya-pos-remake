import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { AuthService } from "../auth.service";

@Injectable()
export class MerchantStrategy extends PassportStrategy(Strategy, "merchant") {
  constructor(private authService: AuthService) {
    super({
      usernameField: "username",
      passwordField: "password",
    });
  }

  async validate(username: string, password: string): Promise<any> {
    const merchantAuth = await this.authService.validateMerchant(
      username,
      password,
    );
    return merchantAuth;
  }
}
