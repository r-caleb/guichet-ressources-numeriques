import { Module } from '@nestjs/common';
import { AdminMinistriesController } from './admin-ministries.controller';
import { MinistriesController } from './ministries.controller';
import { MinistriesService } from './ministries.service';

@Module({
  controllers: [MinistriesController, AdminMinistriesController],
  providers: [MinistriesService],
  exports: [MinistriesService],
})
export class MinistriesModule {}
