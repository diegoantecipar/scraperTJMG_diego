import prisma from "../database/prismaClient.js";

export class SettingRepository {
	async getByKey(key) {
		return prisma.setting.findUnique({ where: { key } });
	}

	async set(key, value) {
		return prisma.setting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}

	async list() {
		return prisma.setting.findMany();
	}
}
