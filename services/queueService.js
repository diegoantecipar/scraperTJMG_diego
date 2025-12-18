import { Queue } from "bullmq";

export class QueueService {
	static queue = new Queue("scraping", {
		connection: { host: "localhost", port: 6379 },
	});

	/**
	 * Adiciona um job à fila "scraping".
	 * @param {string} name - Nome do job.
	 * @param {object} data - Dados do job.
	 * @param {object} opts - Opções adicionais do BullMQ (opcional).
	 */
	static async addJob(name, data, opts = {}) {
		return await QueueService.queue.add(name, data, {
			attempts: 3, // Tenta novamente três vezes em caso de falha
			...opts, // Permite passar outras opções do BullMQ
		});
	}
}
