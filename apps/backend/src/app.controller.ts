import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({
    summary: "Vérifier l'état de l'API",
    description: "Retourne l'état minimal du serveur pour vérifier que le backend répond.",
  })
  health() {
    return this.appService.health();
  }
}
