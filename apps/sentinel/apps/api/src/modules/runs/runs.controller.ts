import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { RunsService } from './runs.service.js';

@Controller('runs')
export class RunsController {
	constructor(private readonly runsService: RunsService) {}

	@Get(':id')
	async getRun(@Param('id') id: string) {
		const run = await this.runsService.getRun(id);
		if (!run) throw new NotFoundException('Run not found');
		return run;
	}

	@Get(':id/report')
	async getReport(@Param('id') id: string) {
		const report = await this.runsService.getReport(id);
		if (!report) throw new NotFoundException('Report not found');
		return report;
	}
}

