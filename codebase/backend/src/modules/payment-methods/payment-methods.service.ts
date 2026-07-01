import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto/payment-method.dto';
import { getTenantId } from '../../common/tenant/tenant.context';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly paymentMethodRepository: PaymentMethodRepository) {}

  async create(dto: CreatePaymentMethodDto) {
    const tenantId = getTenantId();

    const existingName = await this.paymentMethodRepository.findOne({ name: dto.name });
    if (existingName) {
      throw new ConflictException('Payment method with this name already exists');
    }

    const existingCode = await this.paymentMethodRepository.findOne({ code: dto.code.toUpperCase() });
    if (existingCode) {
      throw new ConflictException('Payment method with this code already exists');
    }

    return this.paymentMethodRepository.create({
      ...dto,
      code: dto.code.toUpperCase(),
      organization: tenantId as any,
    });
  }

  async findAll() {
    return this.paymentMethodRepository.find({});
  }

  async findOne(id: string) {
    const method = await this.paymentMethodRepository.findById(id);
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }
    return method;
  }

  async update(id: string, dto: UpdatePaymentMethodDto) {
    const method = await this.findOne(id);

    if (dto.name && dto.name !== method.name) {
      const existingName = await this.paymentMethodRepository.findOne({ name: dto.name });
      if (existingName) {
        throw new ConflictException('Payment method with this name already exists');
      }
    }

    if (dto.code && dto.code.toUpperCase() !== method.code) {
      const existingCode = await this.paymentMethodRepository.findOne({ code: dto.code.toUpperCase() });
      if (existingCode) {
        throw new ConflictException('Payment method with this code already exists');
      }
    }

    const updateData: any = { ...dto };
    if (dto.code) updateData.code = dto.code.toUpperCase();

    return this.paymentMethodRepository.update(id, updateData);
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.paymentMethodRepository.delete(id);
  }
}
