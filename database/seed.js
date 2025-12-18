import prisma from "./prismaClient.js";

async function main() {
	await prisma.setting.upsert({
		where: { key: "webhook_url" },
		update: { value: "https://n8n-n8n.wju2x4.easypanel.host/webhook/73fcd6da-1093-4880-8bc8-00bcb28c336b" },
		create: {
			key: "webhook_url",
			value: "https://n8n-n8n.wju2x4.easypanel.host/webhook/73fcd6da-1093-4880-8bc8-00bcb28c336b",
		},
	});

	await prisma.setting.upsert({
		where: { key: "error_webhook_url" },
		update: { value: "https://n8n-n8n.wju2x4.easypanel.host/webhook/73fcd6da-1093-4880-8bc8-00bcb28c336b" },
		create: {
			key: "error_webhook_url",
			value: "https://n8n-n8n.wju2x4.easypanel.host/webhook/73fcd6da-1093-4880-8bc8-00bcb28c336b",
		},
	});

	await prisma.setting.upsert({
		where: { key: "browser_headless" },
		update: { value: "true" },
		create: { key: "browser_headless", value: "true" },
	});

	await prisma.setting.upsert({
		where: { key: "hide_closed" },
		update: { value: "true" },
		create: { key: "hide_closed", value: "true" },
	});

	console.log("Default settings seeded!");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
