import { Module } from '@nestjs/common';
import { RequestsModule } from '../requests/requests.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [RequestsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
