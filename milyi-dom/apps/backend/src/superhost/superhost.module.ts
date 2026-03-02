import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SuperhostService } from './superhost.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    QueueModule,
  ],
  providers: [SuperhostService],
})
export class SuperhostModule {}
