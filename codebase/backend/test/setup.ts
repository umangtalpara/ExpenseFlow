const { Inject } = require('@nestjs/common');

jest.mock('@nestjs/bullmq', () => {
  return {
    BullModule: {
      forRoot: () => ({
        module: class {},
        providers: [],
        exports: [],
      }),
      forRootAsync: () => ({
        module: class {},
        providers: [],
        exports: [],
      }),
      registerQueue: () => ({
        module: class {},
        providers: [
          {
            provide: 'BullQueue_budget-alerts',
            useValue: {
              add: jest.fn(),
            },
          },
        ],
        exports: ['BullQueue_budget-alerts'],
      }),
    },
    Processor: () => (target: any) => target,
    InjectQueue: (name: string) => Inject(`BullQueue_${name}`),
    getQueueToken: (name: string) => `BullQueue_${name}`,
    WorkerHost: class WorkerHost {
      async process(job: any): Promise<any> {}
    },
  };
});
