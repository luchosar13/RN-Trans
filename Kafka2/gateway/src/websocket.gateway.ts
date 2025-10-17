import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io'; 
import { Injectable } from '@nestjs/common';

// Mapa para guardar qué sockets están suscritos a qué userId/transactionId
// { userId: [socketId1, socketId2], transactionId: [socketId3] }
type Subscriptions = { [key: string]: string[] };

@WebSocketGateway({
  cors: {
    origin: '*', // Ajustar en producción
  },
  port: parseInt(process.env.WS_PORT, 10) || 8080,
})
@Injectable()
export class WebsocketGateway {
  @WebSocketServer()
  server: Server;

  // Almacenamiento simple de suscripciones
  private subscriptions: Subscriptions = {};
  
  // Mapeo inverso: socketId -> keys (para limpieza al desconectar)
  private socketSubscriptions: { [socketId: string]: Set<string> } = {};

  // Método llamado por KafkaConsumerService para hacer el push
  public pushEvent(event: any) {
    const { userId, transactionId } = event;

    // 1. Enviar a todos los suscriptores por userId
    this.sendToSubscribers(`user-${userId}`, 'transaction.event', event);

    // 2. Enviar a todos los suscriptores por transactionId
    this.sendToSubscribers(`txn-${transactionId}`, 'transaction.event', event);
  }
  
  private sendToSubscribers(key: string, eventName: string, data: any) {
      if (this.subscriptions[key]) {
          this.subscriptions[key].forEach(socketId => {
              this.server.to(socketId).emit(eventName, data);
          });
      }
  }

  // --- Manejo de Conexiones WebSocket ---
  
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Limpiar suscripciones del socket desconectado
    const keys = this.socketSubscriptions[client.id];
    if (keys) {
      keys.forEach(key => {
        this.subscriptions[key] = this.subscriptions[key].filter(id => id !== client.id);
        if (this.subscriptions[key].length === 0) {
            delete this.subscriptions[key];
        }
      });
      delete this.socketSubscriptions[client.id];
    }
  }

  // Permite al cliente RN suscribirse a userId o transactionId [cite: 11]
  @SubscribeMessage('subscribe')
  handleSubscription(@MessageBody() data: { userId?: string, transactionId?: string }, @ConnectedSocket() client: Socket): void {
    const keysToSubscribe: string[] = [];

    if (data.userId) {
      keysToSubscribe.push(`user-${data.userId}`);
    }
    if (data.transactionId) {
      keysToSubscribe.push(`txn-${data.transactionId}`);
    }

    if (keysToSubscribe.length > 0) {
      console.log(`Socket ${client.id} subscribing to: ${keysToSubscribe.join(', ')}`);
      
      // Registrar suscripciones en el mapa bidireccional
      keysToSubscribe.forEach(key => {
        if (!this.subscriptions[key]) {
          this.subscriptions[key] = [];
        }
        if (!this.subscriptions[key].includes(client.id)) {
          this.subscriptions[key].push(client.id);
        }
        
        if (!this.socketSubscriptions[client.id]) {
            this.socketSubscriptions[client.id] = new Set();
        }
        this.socketSubscriptions[client.id].add(key);
      });
      
      client.emit('subscription.success', { keys: keysToSubscribe });
    }
  }
}