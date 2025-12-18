/**
 * Script principal que integra os scrapers do TJMG e do PJE
 * VERSÃO FINAL - Envia os dados combinados (brutos) para o webhook, conforme solicitado.
 */
import express from "express";
import bodyParser from "body-parser";
import path from "path";
// import { scrapeTJMG } from "./tjmg-scraper.js";
// import { scrapePJE } from "./pje-scraper.js";
// import { writeJsonFile, sendToWebhook } from "./utils.js";
import fs from "fs-extra";
// import { formatData } from "./services/crawler/utils.js";
import { fileURLToPath } from "url";
import { ScrapingService } from "./services/scrapingService.js";
import { ExportRepository } from "./repositories/exportRepository.js";
import config from "./config.js";
import cors from "cors";
import { SettingRepository } from "./repositories/settingRepository.js";

// Para __dirname funcionar em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----- TODO O SEU CÓDIGO DO SERVIDOR EXPRESS É MANTIDO ABAIXO -----
const app = express();
const port = 3001;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// **SERVIR ARQUIVOS ESTÁTICOS DO REACT BUILD**
app.use(express.static(path.join(__dirname, "views/dist")));

// **ROTA PRINCIPAL - DEV vs PROD**
app.get("/", async (req, res) => {
	// Verificar se estamos em desenvolvimento
	if (process.env.NODE_ENV === "development") {
		return res.redirect("http://localhost:5173");
	}

	// Em produção, servir o index.html do build
	const indexPath = path.join(__dirname, "views/dist/index.html");

	// Verificar se o arquivo existe
	if (await fs.pathExists(indexPath)) {
		return res.sendFile(indexPath);
	} else {
		return res.status(404).send("Frontend não foi compilado. Execute 'npm run build' primeiro.");
	}
});

app.post("/scrape", async (req, res) => {
	try {
		// Validação básica dos dados de consulta
		const { entidade, anoInicio, anoFim, ocultarFechados, maxPages, headless } = req.body;

		if (!entidade || !anoInicio || !anoFim) {
			return res.status(400).send("Preencha todos os campos obrigatórios: entidade, ano de início e ano de fim.");
		}

		const consulta = {
			entidade: entidade.trim(),
			anoInicio: parseInt(anoInicio, 10),
			anoFim: parseInt(anoFim, 10),
			ocultarFechados: ocultarFechados,
			maxPages: maxPages ? parseInt(maxPages, 10) : undefined,
			headless: headless,
		};

		const exportId = await ScrapingService.scrap(consulta);

		res.status(200).json({
			message: "Scraping iniciado com sucesso!",
			exportId,
		});
	} catch (error) {
		console.error("Erro ao adicionar scraping à fila:", error);
		res.status(500).send("Erro ao adicionar scraping à fila.");
	}
});

app.get("/download/:exportId", async (req, res) => {
	try {
		const exportId = parseInt(req.params.exportId, 10);
		if (isNaN(exportId)) {
			return res.status(400).send("ID do export inválido.");
		}

		const exportRepo = new ExportRepository();
		const exportData = await exportRepo.getById(exportId);

		console.log(`Exportando dados combinados para o export ${exportId}`);

		if (!exportData || !exportData.jsonFiles || exportData.jsonFiles.length === 0) {
			return res.status(404).send("Export ou arquivos JSON não encontrados.");
		}

		// Lê e combina todos os arquivos JSON associados ao export
		let combined = [];
		for (const file of exportData.jsonFiles) {
			try {
				const fileContent = await fs.readJson(file.path);
				if (Array.isArray(fileContent)) {
					combined = combined.concat(fileContent);
				} else {
					combined.push(fileContent);
				}
			} catch (err) {
				console.error(`Erro ao ler o arquivo ${file.path}:`, err);
			}
		}

		const fileName = `export_${exportId}_combined.json`;
		res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
		res.setHeader("Content-Type", "application/json");
		res.send(JSON.stringify(combined, null, 2));
	} catch (error) {
		console.error("Erro ao fazer download do export combinado:", error);
		res.status(500).send("Erro ao baixar o export combinado.");
	}
});

app.get("/status", async (req, res) => {
	try {
		const exportRepo = new ExportRepository();
		// Busca todos os exports que não estão completos
		const exports = await exportRepo.listNotComplete();

		const results = [];
		for (const exportData of exports) {
			// Busca falhas associadas
			const failures = await exportRepo.getFailures(exportData.id);
			const errors = await exportRepo.getErrors(exportData.id);

			// Total de páginas processadas = arquivos JSON + falhas (páginas únicas)
			const processedPages = new Set();
			if (exportData.jsonFiles && Array.isArray(exportData.jsonFiles)) {
				exportData.jsonFiles.forEach((f) => {
					processedPages.add(f.page || f.id);
				});
			}
			failures.forEach((f) => processedPages.add(f.page));

			results.push({
				exportId: exportData.id,
				complete: exportData.complete,
				totalProcessedPages: processedPages.size,
				totalPages: exportData.totalPages || 0,
				failures: failures.map((f) => ({
					page: f.page,
					reason: f.reason,
					createdAt: f.createdAt,
				})),
				errors: errors.map((e) => ({
					error: e.error,
					stack: e.stack,
				})),
			});

			// exportRepo.markComplete(exportData.id);
		}

		res.json(results);
	} catch (error) {
		console.error("Erro ao consultar status dos exports:", error);
		res.status(500).send("Erro ao consultar status dos exports.");
	}
});

app.get("/exports", async (req, res) => {
	try {
		const exportRepo = new ExportRepository();

		// Paginação
		const page = parseInt(req.query.page, 10) || 1;
		const pageSize = parseInt(req.query.pageSize, 10) || 10;
		const skip = (page - 1) * pageSize;

		// Busca total de exports completos
		const totalCount = await exportRepo.countComplete();

		// Busca exports completos paginados
		const exports = await exportRepo.listCompletePaginated(skip, pageSize);

		const results = [];
		for (const exportData of exports) {
			if (!exportData.jsonFiles || exportData.jsonFiles.length === 0) {
				continue; // Ignora exports sem arquivos JSON
			}

			const failures = await exportRepo.getFailures(exportData.id);
			const errors = await exportRepo.getErrors(exportData.id);

			results.push({
				exportId: exportData.id,
				entity: exportData.entity,
				yearStart: exportData.yearStart,
				yearEnd: exportData.yearEnd,
				createdAt: exportData.createdAt,
				downloadUrl: `/download/${exportData.id}`,
				failures,
				totalPages: exportData.totalPages || 0,
				errors: errors.map((e) => ({
					error: e.error,
					stack: e.stack,
				})),
			});
		}

		res.json({
			page,
			pageSize,
			totalCount,
			totalPages: Math.ceil(totalCount / pageSize),
			exports: results,
		});
	} catch (error) {
		console.error("Erro ao listar exports completos:", error);
		res.status(500).send("Erro ao listar exports completos.");
	}
});

app.get("/config", (req, res) => {
	try {
		res.json(config);
	} catch (error) {
		console.error("Erro ao buscar configs:", error);
		res.status(500).send("Erro ao buscar configs.");
	}
});

app.get("/webhook", async (req, res) => {
	const settingRepo = new SettingRepository();
	const setting = await settingRepo.getByKey("webhook_url");

	if (!setting || !setting.value) {
		return res.status(404).send("Webhook URL não configurada.");
	}

	const errorSetting = await settingRepo.getByKey("error_webhook_url");

	if (!errorSetting || !errorSetting.value) {
		return res.status(404).send("Webhook de erro não configurada.");
	}

	res.json({ url: setting.value, errorUrl: errorSetting.value });
});

app.post("/webhook", async (req, res) => {
	try {
		const { url, errorUrl } = req.body;
		if (!url && !errorUrl) {
			return res.status(400).send("URL do webhook é obrigatória.");
		}

		const settingRepo = new SettingRepository();
		if (url) await settingRepo.set("webhook_url", url);
		if (errorUrl) await settingRepo.set("error_webhook_url", errorUrl);

		res.send("Webhook URL atualizada com sucesso.");
	} catch (error) {
		console.error("Erro ao atualizar webhook:", error);
		res.status(500).send("Erro ao atualizar webhook.");
	}
});

// Middleware de error handling
app.use((err, req, res, next) => {
	console.error("Express Error:", err);
	res.status(500).json({ error: "Erro interno do servidor" });
});

// Servir React app apenas para rotas que não são API
app.get(/^(?!\/(api|assets|download|status|exports|config|webhook|scrape)).*/, async (req, res) => {
	console.log(`Serving React app for path: ${req.path}`);

	if (process.env.NODE_ENV === "development") {
		return res.redirect("http://localhost:5173");
	}

	const indexPath = path.join(__dirname, "views/dist/index.html");

	try {
		if (await fs.pathExists(indexPath)) {
			return res.sendFile(indexPath);
		} else {
			return res.status(404).send("Frontend não foi compilado.");
		}
	} catch (error) {
		console.error("Erro ao servir index.html:", error);
		return res.status(500).send("Erro interno do servidor.");
	}
});

app.listen(port, () => {
	console.log(`Servidor rodando em http://localhost:${port}`);
});
