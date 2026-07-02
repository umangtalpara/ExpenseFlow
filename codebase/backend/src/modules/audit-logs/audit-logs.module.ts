import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { RolesModule } from '../roles/roles.module'; // Needed for RbacGuard since it injects RoleRepository

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
    RolesModule,
  ],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditLogRepository],
  exports: [AuditLogsService, AuditLogRepository],
})
export class AuditLogsModule {}
