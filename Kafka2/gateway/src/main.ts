import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  // Crear la aplicación NestJS
  const app = await NestFactory.create(AppModule);

  // Usar el adaptador de socket.io para el Gateway
  app.useWebSocketAdapter(new IoAdapter(app));
  
  const port = parseInt(process.env.WS_PORT, 10) || 8080;
  await app.listen(port);
  console.log(`Gateway WebSocket Service corriendo en puerto ${port}`);
}
bootstrap();