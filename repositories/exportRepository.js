import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export class ExportRepository {
	async create(data) {
		return prisma.export.create({ data });
	}

	async getById(id) {
		return prisma.export.findUnique({ where: { id }, include: { jsonFiles: true } });
	}

	async list() {
		return prisma.export.findMany({ include: { jsonFiles: true } });
	}

	async listComplete() {
		return prisma.export.findMany({
			where: { complete: true },
			orderBy: { createdAt: "desc" },
			include: { jsonFiles: true },
		});
	}

	async listNotComplete() {
		return prisma.export.findMany({
			where: { complete: false },
			include: { jsonFiles: true },
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Cria uma falha associada a um export.
	 * @param {number} exportId
	 * @param {number} page
	 * @param {string} reason
	 * @returns {Promise<Object>}
	 */
	async createFailure(exportId, page, reason) {
		return prisma.failure.create({
			data: {
				exportId,
				page,
				reason,
			},
		});
	}

	async removeFailure(exportId, page) {
		return prisma.failure.deleteMany({
			where: { exportId, page },
		});
	}

	async addAttempt(exportId, page) {
		return prisma.failure.updateMany({
			where: { exportId, page },
			data: { attempts: { increment: 1 } },
		});
	}

	async getAttempts(exportId, page) {
		const failure = await prisma.failure.findFirst({
			where: { exportId, page },
			select: { attempts: true },
		});
		return failure ? failure.attempts : 0;
	}

	/**
	 * Busca todas as falhas de um export.
	 * @param {number} exportId
	 * @returns {Promise<Array>}
	 */
	async getFailures(exportId) {
		return prisma.failure.findMany({
			where: { exportId },
			orderBy: { page: "asc" },
		});
	}

	async getFailure(exportId, page) {
		return prisma.failure.findFirst({
			where: { exportId, page },
		});
	}

	async createError(exportId, error) {
		return prisma.processError.create({
			data: {
				exportId,
				message: error.message,
				stack: error.stack,
			},
		});
	}

	async getErrors(exportId) {
		return prisma.processError.findMany({
			where: { exportId },
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Conta o número de falhas de um export.
	 * @param {number} exportId
	 * @returns {Promise<number>}
	 */
	async countFailures(exportId) {
		return prisma.failure.count({
			where: { exportId },
		});
	}

	async markComplete(exportId) {
		return prisma.export.update({
			where: { id: exportId },
			data: { complete: true },
		});
	}

	async updateTotalPages(exportId, totalPages) {
		return prisma.export.update({
			where: { id: exportId },
			data: { totalPages },
		});
	}

	async countComplete() {
		return prisma.export.count({
			where: { complete: true },
		});
	}

	async listCompletePaginated(skip = 0, take = 10) {
		return prisma.export.findMany({
			where: { complete: true },
			orderBy: { createdAt: "desc" },
			include: { jsonFiles: true },
			skip,
			take,
		});
	}
}
