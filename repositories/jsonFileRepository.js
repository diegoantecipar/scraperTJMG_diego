import prisma from "../database/prismaClient.js";

export class JsonFileRepository {
	async create(data) {
		return prisma.jsonFile.create({ data });
	}

	async listByExport(exportId) {
		return prisma.jsonFile.findMany({ where: { exportId } });
	}
}
