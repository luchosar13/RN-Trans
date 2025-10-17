import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // No necesitamos un puerto HTTP/REST, solo el contexto de la aplicación
  // para iniciar los servicios (como el consumidor de Kafka).
  console.log('Orchestrator Service iniciado y escuchando comandos...');
}
bootstrap();