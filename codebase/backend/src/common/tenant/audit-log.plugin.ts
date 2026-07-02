import { Schema, Query } from 'mongoose';
import { getTenantId, tenantLocalStorage } from './tenant.context';

export function auditLogPlugin(schema: Schema): void {
  // If the schema belongs to the AuditLog itself, do not apply audit logging (prevents infinite loop)
  const collectionName = schema.get('collection');
  if (collectionName === 'audit_logs') {
    return;
  }

  // Post-save hook to log document creations
  schema.post('save', async function (doc: any) {
    // Skip embedded subdocuments and invalid constructors
    if (doc.$isEmbedded || !doc.constructor || !doc.constructor.modelName) {
      return;
    }

    const tenantId = getTenantId();
    const store = tenantLocalStorage.getStore();
    const userId = store?.userId;

    if (!tenantId || !userId) {
      return;
    }

    try {
      const AuditLogModel = doc.constructor.model('AuditLog');
      if (AuditLogModel) {
        // Exclude sensitive fields from log details
        const details = doc.toObject ? doc.toObject() : { ...doc };
        if (details.password) delete details.password;
        if (details.resetPasswordToken) delete details.resetPasswordToken;

        await AuditLogModel.create({
          organization: tenantId,
          user: userId,
          action: 'CREATE',
          entityType: doc.constructor.modelName,
          entityId: doc._id.toString(),
          details,
        });
      }
    } catch (err) {
      // Fail silently to avoid breaking the request in case of logging failures
      console.error('AuditLogPlugin post-save error:', err);
    }
  });

  // Post-findOneAndUpdate hook to log updates
  schema.post('findOneAndUpdate', async function (this: any, doc: any) {
    const tenantId = getTenantId();
    const store = tenantLocalStorage.getStore();
    const userId = store?.userId;

    if (!tenantId || !userId || !doc) {
      return;
    }

    try {
      const AuditLogModel = doc.constructor.model('AuditLog');
      if (AuditLogModel) {
        const updateQuery = this.getUpdate();
        
        // Clean sensitive data
        const cleanUpdate = { ...updateQuery };
        if (cleanUpdate.$set) {
          cleanUpdate.$set = { ...cleanUpdate.$set };
          if (cleanUpdate.$set.password) delete cleanUpdate.$set.password;
          if (cleanUpdate.$set.resetPasswordToken) delete cleanUpdate.$set.resetPasswordToken;
        }

        await AuditLogModel.create({
          organization: tenantId,
          user: userId,
          action: 'UPDATE',
          entityType: doc.constructor.modelName || this.model.modelName,
          entityId: doc._id.toString(),
          details: cleanUpdate,
        });
      }
    } catch (err) {
      console.error('AuditLogPlugin post-findOneAndUpdate error:', err);
    }
  });
}
