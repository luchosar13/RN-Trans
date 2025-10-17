import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// Define el tipo para el Event Envelope (simplificado para el ejemplo)
interface EventEnvelope<T> {
  id: string; // uuid v4 [cite: 68, 70]
  type: string; // ej: "txn.TransactionInitiated" [cite: 69, 71]
  version: number; // 1 [cite: 72, 73]
  ts: number; // epoch ms [cite: 74, 75]
  transactionId: string; // clave de partición [cite: 77]
  userId: string; [cite: 78]
  payload: T; [cite: 79]
}

// Tipo específico para la transacción iniciada [cite: 83]
interface TransactionInitiatedPayload {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  userId: string;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private readonly KAFKA_BROKERS = process.env.KAFKA_BROKERS.split(',');

  constructor() {
    this.kafka = new Kafka({
      clientId: 'api-producer',
      brokers: this.KAFKA_BROKERS,
    });
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    console.log('Kafka Producer conectado');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    console.log('Kafka Producer desconectado');
  }

  /**
   * Publica el evento TransactionInitiated en txn.commands [cite: 9, 39, 40]
   * usando transactionId como clave de partición[cite: 14, 77].
   */
  async publishTransactionInitiated(transactionData: TransactionInitiatedPayload): Promise<string> {
    const transactionId = uuidv4();
    const event: EventEnvelope<TransactionInitiatedPayload> = {
      id: uuidv4(),
      type: 'txn.TransactionInitiated',
      version: 1,
      ts: Date.now(),
      transactionId: transactionId,
      userId: transactionData.userId,
      payload: transactionData,
    };

    try {
      await this.producer.send({
        topic: 'txn.commands', // Tópico de comandos [cite: 13]
        messages: [{
          key: transactionId, // Clave de partición [cite: 14, 77]
          value: JSON.stringify(event),
        }],
      });
      return transactionId;
    } catch (error) {
      console.error('Error publicando a Kafka:', error);
      throw new Error('Fallo al iniciar la transacción.');
    }
  }
}