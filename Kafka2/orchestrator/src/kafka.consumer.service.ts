import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, Producer, EachMessagePayload } from 'kafkajs';
import { OrchestratorService } from './orchestrator.service'; // Inyección de la lógica principal

// Definiciones de tipos de eventos (Event Envelope)
interface EventEnvelope<T> {
  id: string;
  type: string;
  version: number;
  ts: number;
  transactionId: string;
  userId: string;
  payload: T;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer; // Se necesita el productor para emitir txn.events y txn.dlq
  private readonly KAFKA_BROKERS = process.env.KAFKA_BROKERS.split(',');
  private readonly CONSUMER_GROUP_ID = 'orchestrator-group';

  constructor(private readonly orchestratorService: OrchestratorService) {
    this.kafka = new Kafka({
      clientId: 'orchestrator-client',
      brokers: this.KAFKA_BROKERS,
    });
    
    // Configuración del Consumidor
    this.consumer = this.kafka.consumer({ 
      groupId: this.CONSUMER_GROUP_ID,
      allowAutoTopicCreation: false
    });

    // Configuración del Productor
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();

    // Suscribirse al tópico de comandos
    await this.consumer.subscribe({ 
      topic: 'txn.commands', 
      fromBeginning: false 
    });

    // Iniciar el procesamiento de mensajes
    this.consumer.run({
      eachMessage: async (payload) => {
        try {
          const event: EventEnvelope<any> = JSON.parse(payload.message.value.toString());
          console.log(`Comando recibido: ${event.type} para TXN: ${event.transactionId}`);
          
          // Llamar al servicio de orquestación para manejar el evento
          await this.orchestratorService.processCommand(event, this.producer);
          
          // Confirma el offset después de un procesamiento exitoso
          // (KafkaJS gestiona el commit, pero este es el punto lógico)

        } catch (error) {
          console.error(`Error al procesar mensaje. Enviando a DLQ.`, error);
          
          // Manejo de Errores: Enviar a txn.dlq [cite: 10, 43-46]
          // Esto es un error "no recuperable" o inesperado.
          const dlqMessage = {
             originalMessage: payload.message.value.toString(),
             error: error.message,
             timestamp: Date.now(),
          };

          await this.producer.send({
            topic: 'txn.dlq', // Tópico de errores
            messages: [{ 
              key: payload.message.key,
              value: JSON.stringify(dlqMessage) 
            }],
          });
          // Nota: En KafkaJS, si el mensaje falla aquí, el reintento se maneja por el framework 
          // o se requiere una lógica más avanzada de commit manual. Asumiremos que al 
          // enviar a DLQ, el mensaje puede ser comiteado para no bloquear el grupo.
        }
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    await this.producer.disconnect();
    console.log('Kafka Consumer/Producer desconectado');
  }
}