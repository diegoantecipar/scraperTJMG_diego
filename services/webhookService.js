import { SettingRepository } from "../repositories/settingRepository.js";
import { ExportRepository } from "../repositories/exportRepository.js";
import fs from "fs/promises";
import axios from "axios";

export class WebhookService {
	/**
	 * Envia todos os arquivos JSON de um export para a URL do webhook salva no banco.
	 * O payload é SEMPRE um array de objetos (mesmo que o arquivo tenha só 1 objeto).
	 *
	 * @param {number} exportId
	 */
	static async sendExportToWebhook(exportId) {
		const settingRepo = new SettingRepository();
		const exportRepo = new ExportRepository();

		// 1) Busca URL do webhook de dados
		const setting = await settingRepo.getByKey("webhook_url");
		if (!setting || !setting.value) {
			throw new Error("Webhook URL não configurada no banco.");
		}
		const webhookUrl = setting.value.trim();

		// 2) Busca export + arquivos JSON
		const exportData = await exportRepo.getById(exportId);
		if (!exportData) {
			throw new Error(`Export com id ${exportId} não encontrado.`);
		}

		if (!exportData.jsonFiles || exportData.jsonFiles.length === 0) {
			throw new Error("Export não possui arquivos JSON gerados.");
		}

		// 3) Lê todos os arquivos JSON e monta um array único de registros
		const payload = [];

		for (const jsonFile of exportData.jsonFiles) {
			if (!jsonFile.path) {
				console.warn(`JsonFile com id ${jsonFile.id} não possui path. Pulando.`);
				continue;
			}

			try {
				const fileContent = await fs.readFile(jsonFile.path, "utf8");
				if (!fileContent || !fileContent.trim()) {
					console.warn(`Arquivo JSON vazio: ${jsonFile.path}`);
					continue;
				}

				const data = JSON.parse(fileContent);

				if (Array.isArray(data)) {
					payload.push(...data);
				} else if (typeof data === "object" && data !== null) {
					payload.push(data);
				} else {
					console.warn(
						`Conteúdo do arquivo ${jsonFile.path} não é objeto nem array. Tipo: ${typeof data}`,
					);
				}
			} catch (err) {
				console.error(`Erro ao ler/parsear arquivo JSON (${jsonFile.path}):`, err);
				// registra erro no banco, mas não impede envio dos demais
				await exportRepo.createError(exportId, {
					message: `Erro ao processar arquivo JSON (${jsonFile.path}): ${err.message}`,
					stack: err.stack,
				});
			}
		}

		if (payload.length === 0) {
			throw new Error("Nenhum dado válido encontrado nos arquivos JSON do export.");
		}

		// 4) Envia para o webhook (n8n)
		try {
			console.log(
				`Enviando ${payload.length} registros para o webhook de dados (${webhookUrl})...`,
			);

			await axios.post(webhookUrl, payload, {
				headers: { "Content-Type": "application/json" },
				maxBodyLength: Infinity,
			});

			console.log("Webhook de dados enviado com sucesso.");
		} catch (err) {
			console.error("Erro ao enviar dados para o webhook:", err?.response?.data || err.message);
			throw new Error("Falha ao enviar dados para o webhook.");
		}
	}

	/**
	 * Envia falhas + erros de processamento para o webhook de erro salvo no banco.
	 * Payload:
	 * {
	 *   failures: [...],
	 *   errors: [...],
	 *   export: { ... }
	 * }
	 *
	 * @param {number} exportId
	 */
	static async sendErrorToWebhook(exportId) {
		const settingRepo = new SettingRepository();
		const exportRepo = new ExportRepository();

		// 1) Busca URL do webhook de erros
		const setting = await settingRepo.getByKey("error_webhook_url");
		if (!setting || !setting.value) {
			throw new Error("Webhook de erro não configurada no banco.");
		}
		const webhookUrl = setting.value.trim();

		// 2) Busca dados de erros/falhas
		const [failures, errors, exportData] = await Promise.all([
			exportRepo.getFailures(exportId),
			exportRepo.getErrors(exportId),
			exportRepo.getById(exportId),
		]);

		if (!exportData) {
			throw new Error(`Export com id ${exportId} não encontrado.`);
		}

		// 3) Envia para webhook de erros (n8n)
		try {
			console.log(
				`Enviando ${failures.length} failures e ${errors.length} errors para webhook de erro (${webhookUrl})...`,
			);

			await axios.post(
				webhookUrl,
				{ failures, errors, export: exportData },
				{
					headers: { "Content-Type": "application/json" },
				},
			);

			console.log("Webhook de erro enviado com sucesso.");
		} catch (err) {
			console.error("Erro ao enviar erro para o webhook:", err?.response?.data || err.message);
			throw new Error("Falha ao enviar erro para o webhook.");
		}
	}
}
