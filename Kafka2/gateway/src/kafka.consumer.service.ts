import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import { WebsocketGateway } from './websocket.gateway';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;
  private readonly KAFKA_BROKERS = process.env.KAFKA_BROKERS.split(',');
  private readonly CONSUMER_GROUP_ID = 'gateway-group';
  private readonly TOPIC = 'txn.events';

  constructor(private readonly wsGateway: WebsocketGateway) {
    this.kafka = new Kafka({
      clientId: 'gateway-consumer',
      brokers: this.KAFKA_BROKERS,
    });
    this.consumer = this.kafka.consumer({ 
      groupId: this.CONSUMER_GROUP_ID,
      allowAutoTopicCreation: false
    });
  }

  async onModuleInit() {
    await this.consumer.connect();

    // Suscribirse al tópico de eventos
    await this.consumer.subscribe({ 
      topic: this.TOPIC, 
      fromBeginning: false 
    });

    // Iniciar el procesamiento de mensajes
    this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          console.log(`Event consumed: ${event.type} for TXN: ${event.transactionId}`);
          
          // Reenviar el evento al Gateway para que haga el push por WebSocket [cite: 59]
          this.wsGateway.pushEvent(event);

        } catch (error) {
          console.error(`Error al procesar mensaje en Gateway:`, error);
          // Los errores aquí generalmente no detienen el offset.
        }
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    console.log('Kafka Consumer desconectado');
  }
}