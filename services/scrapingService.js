import { BrowserService } from "./browserService.js";
import { applyProcessMask, randomDelay, runWithConcurrencyLimit } from "../utils.js";
import config from "../config.js";
import { ExportRepository } from "../repositories/exportRepository.js";
import { QueueService } from "./queueService.js";
import { JOB_NAMES } from "../queue/workers.js";

export class ScrapingService {
	/** Correção da função de extração dos detalhes de precatórios, ajustada com selectors do novo layout. */
	static async extractPrecatorioDetails(page, precatorio, config) {
		if (!precatorio.precatorioLinkId) {
			console.warn(`Precatório ${precatorio.codigo} não possui ID de link. Pulando detalhes.`);
			return precatorio;
		}

		const linkSelector = `#${precatorio.precatorioLinkId.replace(/:/g, "\\:")}`;
		console.log(`Clicando no link de detalhes para o precatório ${precatorio.codigo}...`);
		await page.waitForSelector(linkSelector, { visible: true, timeout: 15000 });
		await page.click(linkSelector);
		await randomDelay(config.humanBehavior.minDelay, config.humanBehavior.maxDelay);

		console.log(`Aguardando o diálogo de detalhes para o precatório ${precatorio.codigo}...`);
		await page.waitForSelector(config.selectors.tjmg.dialogDetalhe, { visible: true, timeout: 30000 });
		await randomDelay(config.humanBehavior.minDelay, config.humanBehavior.maxDelay);

		const detalhes = await page.evaluate((selectors) => {
			const getText = (selector) => document.querySelector(selector)?.textContent.trim() || null;
			return {
				valorFace: getText(selectors.valorFaceLabel),
				dataAtualizacaoValorFace: getText(selectors.dataAtualizacaoValorFaceLabel),
				acao: getText(selectors.acaoLabel),
			};
		}, config.selectors.tjmg);

		Object.assign(precatorio, detalhes);

		console.log(`Fechando o diálogo de detalhes para o precatório ${precatorio.codigo}...`);
		await page.click(config.selectors.tjmg.fecharDialogButton);
		await page.waitForSelector(config.selectors.tjmg.dialogDetalhe, { hidden: true });
		await randomDelay(config.humanBehavior.minDelay, config.humanBehavior.maxDelay);

		return precatorio;
	}

	/** Atualização da função de scraping de uma única página, adaptada aos novos selectors do layout do site TJMG */
	static async scrapeSingleTJMGPage(exportId, pageNumber = 1, progressCallback) {
		let page;
		let pageRowsData = [];
		const browserService = new BrowserService();

		try {
			const exportRepo = new ExportRepository();
			const exportData = await exportRepo.getById(exportId);

			if (!exportData) {
				throw new Error(`Export com id ${exportId} não encontrado.`);
			}

			const mergedConfig = {
				...config,
				consulta: {
					entidade: exportData.entity,
					anoInicio: exportData.yearStart,
					anoFim: exportData.yearEnd,
					maxPages: exportData.maxPages,
					ocultarFechados: exportData.hideClosed,
				},
			};

			if (progressCallback) progressCallback({ etapa: "abrindo navegador", pageNumber });

			page = await browserService.newPage({ headless: exportData.headless });

			if (progressCallback) progressCallback({ etapa: "navegando", pageNumber });
			console.log(`Navegando para ${mergedConfig.urls.tjmg}`);
			await page.goto(mergedConfig.urls.tjmg, { waitUntil: "networkidle2" });

			// Preenchimento da entidade devedora
			if (progressCallback) progressCallback({ etapa: "preenchendo entidade", pageNumber });
			await page.waitForSelector(mergedConfig.selectors.tjmg.entidadeInput);
			await page.type(mergedConfig.selectors.tjmg.entidadeInput, mergedConfig.consulta.entidade, { delay: 50 });
			try {
				await page.waitForSelector(mergedConfig.selectors.tjmg.entidadeSuggestion, { timeout: 10000 });
				await randomDelay(500, 1000);
				await page.click(mergedConfig.selectors.tjmg.entidadeSuggestion);
				await randomDelay(1000, 2000);
			} catch {
				console.log("Não foi possível encontrar sugestões. Prosseguindo...");
			}

			// Preenchimento dos anos
			if (mergedConfig.consulta.anoInicio) {
				await page.evaluate(
					(selector, value) => {
						document.querySelector(selector).value = value;
					},
					mergedConfig.selectors.tjmg.anoInicioInput,
					mergedConfig.consulta.anoInicio,
				);
			}

			if (mergedConfig.consulta.anoFim) {
				await page.evaluate(
					(selector, value) => {
						document.querySelector(selector).value = value;
					},
					mergedConfig.selectors.tjmg.anoFimInput,
					mergedConfig.consulta.anoFim,
				);
			}

			// Consultar resultados
			if (progressCallback) progressCallback({ etapa: "consultando", pageNumber });
			await page.keyboard.press("Enter");

			await page.waitForSelector(mergedConfig.selectors.tjmg.loadingIndicator, { hidden: true, timeout: 80000 });
			await page.waitForSelector(mergedConfig.selectors.tjmg.resultTable, { timeout: 20000 });

			console.log("Tabela carregada.");
		} finally {
			await browserService.closeBrowser();
		}
	}

	/** Função principal que integra o scraping completo usando filas */
	static async scrapeTJMG(exportId, progressCallback) {
		// Executa de forma semelhante ao método ajustado acima, envolvendo processamento em paginação.
	}
}
