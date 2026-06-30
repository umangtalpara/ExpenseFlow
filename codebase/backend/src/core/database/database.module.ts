import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TenantService } from '../tenant/tenant.service';
import { tenantPlugin } from '../tenant/tenant.plugin';
import { Schema } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, TenantService],
      useFactory: (configService: ConfigService, tenantService: TenantService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        connectionFactory: (connection) => {
          connection.plugin((schema: Schema) => {
            // Apply tenant isolation only to schemas explicitly marked as tenant-scoped
            if ((schema as any).get('isTenantScoped') === true) {
              tenantPlugin(schema, { tenantService });
            }
          });
          return connection;
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
