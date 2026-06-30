import { Document } from 'mongoose';
export type DesignationDocument = Designation & Document;
export declare class Designation {
    name: string;
    code: string;
    isActive: boolean;
}
export declare const DesignationSchema: import("mongoose").Schema<Designation, import("mongoose").Model<Designation, any, any, any, any, any, Designation>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Designation, Document<unknown, {}, Designation, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Designation & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Designation, Document<unknown, {}, Designation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Designation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    code?: import("mongoose").SchemaDefinitionProperty<string, Designation, Document<unknown, {}, Designation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Designation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, Designation, Document<unknown, {}, Designation, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Designation & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, Designation>;
export declare const DesignationSchemaName: string;
