import { NestModule, MiddlewareConsumer } from '@nestjs/common';
export declare class TenantModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void;
}
