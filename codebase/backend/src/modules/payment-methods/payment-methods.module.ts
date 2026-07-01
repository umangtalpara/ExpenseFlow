import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentMethod, PaymentMethodSchema } from './schemas/payment-method.schema';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
    ]),
    RolesModule,
  ],
  providers: [PaymentMethodRepository, PaymentMethodsService],
  controllers: [PaymentMethodsController],
  exports: [PaymentMethodRepository, PaymentMethodsService],
})
export class PaymentMethodsModule {}
