import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DocumentsModule } from '../documents/documents.module';
import { ReceiptsService } from './receipts.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [AuditModule, DocumentsModule],
  controllers: [RequestsController],
  providers: [RequestsService, ReceiptsService],
  exports: [RequestsService],
})
export class RequestsModule {}
