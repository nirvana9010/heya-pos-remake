import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentUser {
  id: string;
  merchantId: string;
  staffId?: string;
  locationId?: string;
  type: "merchant" | "staff";
  merchant?: any;
  staff?: any;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
