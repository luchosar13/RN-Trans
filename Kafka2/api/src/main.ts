import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Usa el puerto definido en docker-compose
  const port = process.env.API_PORT || 3000; 
  await app.listen(port);
  console.log(`API Service corriendo en puerto ${port}`);
}
bootstrap();