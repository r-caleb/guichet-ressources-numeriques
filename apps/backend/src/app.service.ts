import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'guichet-ressources-numeriques',
      timestamp: new Date().toISOString(),
    };
  }
}
