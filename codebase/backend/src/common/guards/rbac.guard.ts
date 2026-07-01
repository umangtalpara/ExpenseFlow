import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RoleRepository } from '../../modules/roles/repositories/role.repository';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleRepository: RoleRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions are specified, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.role) {
      return false;
    }

    // Fetch user's role from the database bypassing tenant isolation since we are verifying the user role itself,
    // though the user context is set and the role belongs to the same organization.
    const roleId = user.role;
    const userRole = await this.roleRepository.findOne({ _id: roleId }, { bypassTenantIsolation: true });
    if (!userRole) {
      throw new ForbiddenException('User role not found or inactive');
    }

    // Populate role permissions
    const populatedRole = await userRole.populate('permissions');
    const userPermissions = (populatedRole.permissions as any[]).map((p) => p.name);

    // Verify all required permissions are possessed by the user's role
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Access denied: Insufficient permissions');
    }

    return true;
  }
}
