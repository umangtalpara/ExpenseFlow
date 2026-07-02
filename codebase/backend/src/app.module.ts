import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { tenantIsolationPlugin } from './common/tenant/tenant-isolation.plugin';
import { auditLogPlugin } from './common/tenant/audit-log.plugin';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { DesignationsModule } from './modules/designations/designations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { BullModule } from '@nestjs/bullmq';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ReimbursementsModule } from './modules/reimbursements/reimbursements.module';
import { SearchModule } from './modules/search/search.module';

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
          connection.plugin(auditLogPlugin);
          return connection;
        },
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        const url = new URL(redisUrl);
        const connection: any = {
          host: url.hostname,
          port: parseInt(url.port, 10) || 6379,
        };
        if (url.password) connection.password = url.password;
        if (url.username) connection.username = url.username;
        return { connection };
      },
    }),
    OrganizationsModule,
    PermissionsModule,
    RolesModule,
    UsersModule,
    AuthModule,
    InvitationsModule,
    DepartmentsModule,
    DesignationsModule,
    ProjectsModule,
    VendorsModule,
    BudgetsModule,
    CategoriesModule,
    PaymentMethodsModule,
    ExpensesModule,
    ApprovalsModule,
    AuditLogsModule,
    ReimbursementsModule,
    SearchModule,
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
