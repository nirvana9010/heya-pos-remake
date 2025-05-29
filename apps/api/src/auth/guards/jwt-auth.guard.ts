import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SessionService } from '../session.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private sessionService: SessionService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const session = this.sessionService.getSession(token);
      if (!session) {
        return false;
      }

      // Extend session activity (keeping session alive during use)
      this.sessionService.extendSession(token);
      
      // Attach session to request
      request.session = session;
    }

    return true;
  }
}