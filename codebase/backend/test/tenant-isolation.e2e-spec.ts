import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../src/app.module';
import { Organization, OrganizationDocument } from '../src/modules/organizations/schemas/organization.schema';
import { User, UserDocument } from '../src/modules/users/schemas/user.schema';
import { Role, RoleDocument } from '../src/modules/roles/schemas/role.schema';
import { Permission, PermissionDocument } from '../src/modules/permissions/schemas/permission.schema';
import { runWithTenant, tenantLocalStorage } from '../src/common/tenant/tenant.context';

describe('Multi-Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let organizationModel: Model<OrganizationDocument>;
  let userModel: Model<UserDocument>;
  let roleModel: Model<RoleDocument>;
  let permissionModel: Model<PermissionDocument>;

  let tenantAId: string;
  let tenantBId: string;
  let globalPermissionId: string;

  beforeAll(async () => {
    // We override MONGODB_URI to use a test database specifically
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow_test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    organizationModel = moduleFixture.get<Model<OrganizationDocument>>(getModelToken(Organization.name));
    userModel = moduleFixture.get<Model<UserDocument>>(getModelToken(User.name));
    roleModel = moduleFixture.get<Model<RoleDocument>>(getModelToken(Role.name));
    permissionModel = moduleFixture.get<Model<PermissionDocument>>(getModelToken(Permission.name));

    // Clear test database collections
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await permissionModel.deleteMany({});

    // Setup global permission
    const permission = await permissionModel.create({
      name: 'expenses:create',
      description: 'Create expenses',
    });
    globalPermissionId = (permission._id as Types.ObjectId).toString();

    // Create two Organizations (tenants)
    const orgA = await organizationModel.create({ name: 'Tenant A', slug: 'tenant-a' });
    const orgB = await organizationModel.create({ name: 'Tenant B', slug: 'tenant-b' });

    tenantAId = (orgA._id as Types.ObjectId).toString();
    tenantBId = (orgB._id as Types.ObjectId).toString();
  });

  afterAll(async () => {
    // Clean up databases and close connection
    await organizationModel.deleteMany({});
    await userModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await roleModel.deleteMany({}).setOptions({ bypassTenantIsolation: true });
    await permissionModel.deleteMany({});
    await app.close();
  });

  it('should automatically set organization ID on document save', async () => {
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantAId, async () => {
        try {
          const role = await roleModel.create({
            name: 'Admin Role',
            permissions: [new Types.ObjectId(globalPermissionId)],
          });

          expect(role.organization.toString()).toBe(tenantAId);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  it('should prevent saving tenant-scoped document without tenant context', async () => {
    // No tenant context set
    expect(tenantLocalStorage.getStore()).toBeUndefined();

    await expect(
      roleModel.create({
        name: 'Orphan Role',
        permissions: [],
      })
    ).rejects.toThrow('Tenant context is required to save this resource');
  });

  it('should isolate queries based on tenant context', async () => {
    // 1. Create a Role in Tenant B
    let roleBId: string = '';
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantBId, async () => {
        try {
          const role = await roleModel.create({
            name: 'Tenant B Role',
            permissions: [],
          });
          roleBId = (role._id as Types.ObjectId).toString();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // 2. Query Roles as Tenant A — should NOT find Tenant B Role
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantAId, async () => {
        try {
          const roles = await roleModel.find({});
          // Should only find the Tenant A role from the previous test
          expect(roles.length).toBe(1);
          expect(roles[0]?.name).toBe('Admin Role');
          expect(roles[0]?.organization.toString()).toBe(tenantAId);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // 3. Query Roles as Tenant B — should NOT find Tenant A Role
    await new Promise<void>((resolve, reject) => {
      runWithTenant(tenantBId, async () => {
        try {
          const roles = await roleModel.find({});
          expect(roles.length).toBe(1);
          expect(roles[0]?.name).toBe('Tenant B Role');
          expect(roles[0]?.organization.toString()).toBe(tenantBId);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  it('should throw an error for queries without tenant context', async () => {
    // Outside tenant context, query should throw BadRequestException
    await expect(roleModel.find({})).rejects.toThrow('Tenant context is required for this operation');
  });

  it('should allow bypassing tenant isolation if bypass option is passed', async () => {
    const roles = await roleModel.find({}).setOptions({ bypassTenantIsolation: true });
    // Should return both Tenant A and Tenant B roles
    expect(roles.length).toBe(2);
  });
});
