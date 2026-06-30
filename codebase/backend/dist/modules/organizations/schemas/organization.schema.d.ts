import { Document } from 'mongoose';
export type OrganizationDocument = Organization & Document;
export declare class Organization {
    name: string;
    slug: string;
    logo?: string;
    currency: string;
    timezone: string;
    status: string;
    subscription: {
        plan: string;
        trialEndsAt?: Date;
        status: string;
    };
    financialYear: {
        startMonth: number;
        endMonth: number;
    };
    taxSettings: {
        taxId?: string;
        taxName?: string;
        taxRate: number;
    };
}
export declare const OrganizationSchema: import("mongoose").Schema<Organization, import("mongoose").Model<Organization, any, any, any, any, any, Organization>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Organization, Document<unknown, {}, Organization, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Organization, Document<unknown, {}, Organization, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    slug?: import("mongoose").SchemaDefinitionProperty<string, Organization, Document<unknown, {}, Organization, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    logo?: import("mongoose").SchemaDefinitionProperty<string | undefined, Organization, Document<unknown, {}, Organization, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    currency?: import("mongoose").SchemaDefinitionProperty<string, Organization, Document<unknown, {}, Organization, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    timezone?: import("mongoose").SchemaDefinitionProperty<string, Organization, Document<unknown, {}, Organization, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    status?: import("mongoose").SchemaDefinitionProperty<string, Organization, Document<unknown, {}, Organization, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    subscription?: import("mongoose").SchemaDefinitionProperty<{
        plan: string;
        trialEndsAt?: Date;
        status: string;
    }, Organization, Document<unknown, {}, Organization, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    financialYear?: import("mongoose").SchemaDefinitionProperty<{
        startMonth: number;
        endMonth: number;
    }, Organization, Document<unknown, {}, Organization, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    taxSettings?: import("mongoose").SchemaDefinitionProperty<{
        taxId?: string;
        taxName?: string;
        taxRate: number;
    }, Organization, Document<unknown, {}, Organization, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Organization & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Organization>;
export declare const OrganizationSchemaName: string;
