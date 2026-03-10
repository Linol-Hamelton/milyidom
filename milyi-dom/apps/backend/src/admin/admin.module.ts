import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SearchModule } from '../search/search.module';
import { DisputesModule } from '../disputes/disputes.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuditModule, SearchModule, DisputesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
