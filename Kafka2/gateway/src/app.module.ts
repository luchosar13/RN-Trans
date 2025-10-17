import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { KafkaConsumerService } from './kafka.consumer.service';

@Module({
  imports: [],
  controllers: [],
  // Proveedores: el Gateway (servidor WS) y el consumidor de Kafka
  providers: [WebsocketGateway, KafkaConsumerService], 
})
export class AppModule {}