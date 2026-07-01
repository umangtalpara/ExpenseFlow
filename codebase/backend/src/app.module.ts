import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { tenantIsolationPlugin } from './common/tenant/tenant-isolation.plugin';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { InvitationsModule } from './modules/invitations/invitations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
        PORT: Joi.number().default(3001),
        MONGODB_URI: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
        connectionFactory: (connection) => {
          connection.plugin(tenantIsolationPlugin);
          return connection;
        },
      }),
    }),
    OrganizationsModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
    AuthModule,
    InvitationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
