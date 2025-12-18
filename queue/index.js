import { Worker } from "bullmq";
import Workers, { JOB_NAMES } from "./workers.js";
import { ExportRepository } from "../repositories/exportRepository.js";

const worker = new Worker(
	"scraping",
	async (job) => {
		console.log(`Processando job ${job.id} do tipo ${job.name}`);

		const workers = new Workers();
		await workers.process(job);
	},
	{
		connection: { host: "localhost", port: 6379 },
		concurrency: 3,
		lockDuration: 15 * 60 * 1000,
	},
);

worker.on("completed", (job) => {
	console.log(`Job ${job.id} concluído!`);
});

worker.on("failed", (job, err) => {
	console.error(`Job ${job.id} falhou:`, err);

	if (job.name == JOB_NAMES.SCRAPE_SINGLE_TJMG_PAGE) {
		const exportRepository = new ExportRepository();
		exportRepository.getFailures(job.data.exportId).then((failures) => {
			const workers = new Workers();

			if (failures.length === 0) {
				exportRepository
					.createFailure(job.data.exportId, job.data.pageNumber, err.message)
					.then(() => workers.checkComplete(job.data.exportId));
			}

			const failPage = failures.find((f) => f.page === job.data.pageNumber);
			if (!failPage) {
				exportRepository
					.createFailure(job.data.exportId, job.data.pageNumber, err.message)
					.then(() => workers.checkComplete(job.data.exportId));
			}
		});
	}
});
