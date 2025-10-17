import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { KafkaService } from './kafka.service';

// DTO simple para validar la entrada de la transacción
class TransactionDto {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  userId: string;
}

@Controller('transactions')
export class TransactionController {
  constructor(private readonly kafkaService: KafkaService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED) // Indica que el proceso ha sido aceptado, no necesariamente completado
  async initiateTransaction(@Body() body: TransactionDto) {
    // La API recibe el POST y publica el comando [cite: 9, 37, 38]
    const transactionId = await this.kafkaService.publishTransactionInitiated(body);

    return {
      message: 'Transaction command published successfully.',
      transactionId: transactionId,
      status: 'INITIATED',
    };
  }
}