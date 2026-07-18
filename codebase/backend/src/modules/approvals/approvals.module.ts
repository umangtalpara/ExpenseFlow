import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApprovalWorkflow, ApprovalWorkflowSchema } from './schemas/approval-workflow.schema';
import { ApprovalRequest, ApprovalRequestSchema } from './schemas/approval-request.schema';
import { ApprovalWorkflowRepository } from './repositories/approval-workflow.repository';
import { ApprovalRequestRepository } from './repositories/approval-request.repository';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ExpensesModule } from '../expenses/expenses.module';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ApprovalWorkflow.name, schema: ApprovalWorkflowSchema },
      { name: ApprovalRequest.name, schema: ApprovalRequestSchema },
    ]),
    forwardRef(() => ExpensesModule),
    RolesModule,
    UsersModule,
    MailModule,
    NotificationsModule,
    ProjectsModule,
  ],
  providers: [ApprovalWorkflowRepository, ApprovalRequestRepository, ApprovalsService],
  controllers: [ApprovalsController],
  exports: [ApprovalWorkflowRepository, ApprovalRequestRepository, ApprovalsService],
})
export class ApprovalsModule {}
