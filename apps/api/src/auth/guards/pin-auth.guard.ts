import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class PinAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // For now, we'll allow access if user is authenticated
    // In a real implementation, this would check if PIN was recently verified
    const request = context.switchToHttp().getRequest();
    return !!request.user;
  }
}
