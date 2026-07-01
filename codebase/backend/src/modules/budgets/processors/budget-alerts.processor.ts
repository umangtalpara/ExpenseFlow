import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { AlertLogRepository } from '../repositories/alert-log.repository';

@Processor('budget-alerts')
@Injectable()
export class BudgetAlertsProcessor extends WorkerHost {
  constructor(private readonly alertLogRepository: AlertLogRepository) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { budgetId, projectId, threshold, percentage, amount, spent, organizationId } = job.data;
    
    console.log(
      `[BUDGET ALERT JOB] Scope: ${projectId ? 'Project' : 'Organization'}, ID: ${budgetId}, ` +
      `Threshold: ${threshold}%, Current: ${percentage.toFixed(1)}%, Spent: ${spent}/${amount}`
    );

    // Save alert log to Mongoose database
    await this.alertLogRepository.create({
      budget: budgetId as any,
      project: projectId ? projectId as any : undefined,
      threshold,
      percentage,
      amount,
      spent,
      organization: organizationId as any,
    });
  }
}
