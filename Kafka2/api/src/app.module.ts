import { Module } from '@nestjs/common';
import { TransactionController } from './transaction.controller';
import { KafkaService } from './kafka.service';

@Module({
  imports: [],
  controllers: [TransactionController],
  providers: [KafkaService],
})
export class AppModule {}