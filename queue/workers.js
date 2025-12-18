import { ScrapingService } from "../services/scrapingService.js";
import { FileService } from "../services/fileService.js";
import { ExportRepository } from "../repositories/exportRepository.js";
import { JsonFileRepository } from "../repositories/jsonFileRepository.js";
import { QueueService } from "../services/queueService.js";
import { WebhookService } from "../services/webhookService.js";

export const JOB_NAMES = {
	SCRAPE_SINGLE_TJMG_PAGE: "scrape-single-tjmg-page",
	SCRAPE_TJMG: "scrape-tjmg",
	SEND_WEBHOOK: "send-webhook",
};

export default class Workers {
	async process(job) {
		const progress = (data) => {
			if (job.updateProgress) {
				job.updateProgress(data);
			} else {
				console.warn("Job não suporta updateProgress, ignorando:", job.name);
			}
		};

		switch (job.name) {
			case JOB_NAMES.SCRAPE_SINGLE_TJMG_PAGE:
				return await this.scrapeSingleTJMGPage(job.data, (data) => progress(data));
			case JOB_NAMES.SCRAPE_TJMG:
				return await this.scrapeTJMG(job.data, (data) => progress(data));
			case JOB_NAMES.SEND_WEBHOOK:
				return await this.sendWebhook(job.data.exportId);
			default:
				throw new Error(`Tipo de job desconhecido: ${job.name}`);
		}
	}

	async sendWebhook(exportId) {
		try {
			await WebhookService.sendExportToWebhook(exportId);
			console.log(`Webhook enviado com sucesso para o export ${exportId}`);
		} catch (error) {
			console.error(`Erro ao enviar webhook para o export ${exportId}:`, error);
			const exportRepo = new ExportRepository();
			await exportRepo.createError(exportId, {
				message: `Erro ao enviar webhook: ${error.message}`,
				stack: error.stack,
			});
		}

		try {
			await WebhookService.sendErrorToWebhook(exportId);
			console.log(`Webhook de erros enviado com sucesso para o export ${exportId}`);
		} catch (error) {
			console.error(`Erro ao enviar webhook de erros para o export ${exportId}:`, error);
			const exportRepo = new ExportRepository();
			await exportRepo.createError(exportId, {
				message: `Erro ao enviar webhook de erros: ${error.message}`,
				stack: error.stack,
			});
		}
	}

	async scrapeSingleTJMGPage(data, progressCallback) {
		// data deve conter exportId e pageNumber
		const { exportId, pageNumber } = data;
		const exportRepo = new ExportRepository();
		const jsonFileRepo = new JsonFileRepository();
		try {
			const pageData = await ScrapingService.scrapeSingleTJMGPage(exportId, pageNumber, progressCallback);

			if (!pageData || pageData.length === 0) {
				throw new Error(`Erro ao buscar dados da página ${pageNumber}`);
			}

			const fileName = `export_${exportId}_page_${pageNumber}.json`;
			const fileService = new FileService();
			const filePath = await fileService.upload(pageData, fileName, exportId);

			await jsonFileRepo.create({
				name: fileName,
				path: filePath,
				exportId: exportId,
			});

			const failure = await exportRepo.getFailure(exportId, pageNumber);
			if (failure) await exportRepo.removeFailure(exportId, pageNumber);
		} catch (error) {
			const attempts = await exportRepo.getAttempts(exportId, pageNumber);

			if (attempts === 0) {
				await exportRepo.createFailure(exportId, pageNumber, error.message);
				await exportRepo.addAttempt(exportId, pageNumber);
			} else {
				await exportRepo.addAttempt(exportId, pageNumber);
			}

			throw error;
		} finally {
			await this.checkComplete(exportId);
		}
	}

	async scrapeTJMG(data, progressCallback) {
		const { exportId } = data;

		try {
			await ScrapingService.scrapeTJMG(exportId, progressCallback);
		} catch (error) {
			const exportRepository = new ExportRepository();
			await exportRepository.createError(exportId, {
				message: "Falha ao iniciar scraping do TJMG: " + error.message,
				stack: error.stack,
			});
			await exportRepository.markComplete(exportId);
			console.log(`Erro ao iniciar scraping do TJMG para o export ${exportId}:`, error);
		}
	}

	async checkComplete(exportId) {
		const exportRepo = new ExportRepository();
		// Checa se todas as páginas já foram processadas (sucesso ou falha)
		const exportData = await exportRepo.getById(exportId);
		const failures = await exportRepo.getFailures(exportId);

		// Descobre o total de páginas esperadas
		const totalPages = exportData.totalPages || 1;

		// Páginas processadas = arquivos JSON + falhas (páginas únicas)
		const processedPages = new Set();
		if (exportData.jsonFiles && Array.isArray(exportData.jsonFiles)) {
			exportData.jsonFiles.forEach((f) => {
				processedPages.add(f.name);
			});
		}

		failures.forEach((f) => {
			if (f.attempts >= 2) processedPages.add(f.page);
		});

		if (processedPages.size >= totalPages) {
			await exportRepo.markComplete(exportId);
			await QueueService.addJob(JOB_NAMES.SEND_WEBHOOK, { exportId });
		}
	}
}
