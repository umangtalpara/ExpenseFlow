import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import { InvitationRepository } from './repositories/invitation.repository';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
    ]),
    UsersModule,
    RolesModule,
    OrganizationsModule,
    AuthModule,
    MailModule,
  ],
  providers: [InvitationRepository, InvitationService],
  controllers: [InvitationController],
  exports: [InvitationRepository, InvitationService],
})
export class InvitationsModule {}
