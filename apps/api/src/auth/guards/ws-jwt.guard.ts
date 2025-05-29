import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromClient(client);

      if (!token) {
        throw new WsException('Unauthorized');
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;

      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromClient(client: Socket): string | undefined {
    return (
      client.handshake.query.token as string ||
      client.handshake.auth.token ||
      client.handshake.headers.authorization?.split(' ')[1]
    );
  }
}