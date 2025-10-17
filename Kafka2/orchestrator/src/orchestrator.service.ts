import { Injectable } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

// Tipos de Eventos Salientes
type RiskLevel = 'LOW' | 'HIGH';
type EventType = 'txn.Funds Reserved' | 'txn.FraudChecked' | 'txn.Committed' | 'txn.Reversed' | 'txn.Notified';

interface EventEnvelope<T> {
  id: string;
  type: string;
  version: number;
  ts: number;
  transactionId: string;
  userId: string;
  payload: T;
  correlationId?: string; // Usar el ID del comando como correlationId
}

@Injectable()
export class OrchestratorService {
  
  // Función auxiliar para emitir eventos
  private async emitEvent<T>(producer: Producer, eventType: EventType, transactionId: string, userId: string, payload: T, correlationId: string) {
    const event: EventEnvelope<T> = {
      id: uuidv4(),
      type: eventType,
      version: 1,
      ts: Date.now(),
      transactionId: transactionId,
      userId: userId,
      payload: payload,
      correlationId: correlationId,
    };

    console.log(`Emitting event: ${eventType} for TXN: ${transactionId}`);

    await producer.send({
      topic: 'txn.events', // Tópico de eventos
      messages: [{
        key: transactionId, // CLAVE DE PARTICIÓN (garantiza orden) [cite: 14, 104]
        value: JSON.stringify(event),
      }],
    });
  }

  /**
   * Ejecuta la lógica de la Saga al recibir un comando.
   */
  async processCommand(command: EventEnvelope<any>, producer: Producer) {
    const { type, transactionId, userId, id: correlationId } = command;

    if (type !== 'txn.TransactionInitiated') {
      // Ignorar otros comandos o manejar errores
      console.warn(`Unhandled command type: ${type}`);
      return;
    }

    // --- 1. Funds Reservation ---
    // Simular reserva de fondos
    await this.emitEvent(producer, 'txn.Funds Reserved', transactionId, userId, { 
      ok: true, 
      holdId: uuidv4(), 
      amount: command.payload.amount 
    }, correlationId);

    // --- 2. Fraud Check Simulation ---
    // Simular el chequeo de fraude [cite: 47] (ej. 70% LOW, 30% HIGH)
    const risk: RiskLevel = Math.random() < 0.7 ? 'LOW' : 'HIGH';
    
    await this.emitEvent(producer, 'txn.FraudChecked', transactionId, userId, { 
      risk: risk 
    }, correlationId);

    if (risk === 'LOW') {
      // --- 3a. LOW Risk: Commit Transaction ---
      // Emitir Committed [cite: 51]
      await this.emitEvent(producer, 'txn.Committed', transactionId, userId, { 
        ledgerTxId: uuidv4() 
      }, correlationId);
    } else {
      // --- 3b. HIGH Risk: Reverse Transaction (Rollback) ---
      // Emitir Reversed [cite: 54]
      await this.emitEvent(producer, 'txn.Reversed', transactionId, userId, { 
        reason: 'Fraud Risk HIGH' 
      }, correlationId);
    }

    // --- 4. Notification ---
    // Emitir Notified [cite: 53]
    await this.emitEvent(producer, 'txn.Notified', transactionId, userId, { 
      channels: ['EMAIL', 'PUSH'] 
    }, correlationId);
  }
}