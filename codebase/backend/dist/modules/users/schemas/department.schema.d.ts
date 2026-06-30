import { Document } from 'mongoose';
export type DepartmentDocument = Department & Document;
export declare class Department {
    name: string;
    code: string;
    isActive: boolean;
}
export declare const DepartmentSchema: import("mongoose").Schema<Department, import("mongoose").Model<Department, any, any, any, any, any, Department>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Department, Document<unknown, {}, Department, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Department & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Department, Document<unknown, {}, Department, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Department & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    code?: import("mongoose").SchemaDefinitionProperty<string, Department, Document<unknown, {}, Department, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Department & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, Department, Document<unknown, {}, Department, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Department & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Department>;
export declare const DepartmentSchemaName: string;
