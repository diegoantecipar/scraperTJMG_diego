import { BrowserService } from "./browserService.js";
import { applyProcessMask, randomDelay, runWithConcurrencyLimit } from "../utils.js";
import config from "../config.js";
import { ExportRepository } from "../repositories/exportRepository.js";
import { QueueService } from "./queueService.js";
import { JOB_NAMES } from "../queue/workers.js";

export class ScrapingService {
	/**
	 * Extrai detalhes do precatório na página do TJMG (valor, ação, etc).
	 */
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

	/**
	 * Faz o scraping de uma única página de resultados do TJMG.
	 * @param {number} exportId
	 * @param {number} pageNumber
	 */
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
				browser: {
					...config.browser,
					headless: exportData.headless,
				},
			};

			if (progressCallback) progressCallback({ etapa: "abrindo navegador", pageNumber });

			page = await browserService.newPage({ headless: exportData.headless });

			if (progressCallback) progressCallback({ etapa: "navegando", pageNumber });
			console.log(`Navegando para ${mergedConfig.urls.tjmg}`);
			await page.goto(mergedConfig.urls.tjmg, { waitUntil: "networkidle2" });

			if (progressCallback) progressCallback({ etapa: "preenchendo entidade", pageNumber });
			await page.waitForSelector(mergedConfig.selectors.tjmg.entidadeInput);
			await page.type(mergedConfig.selectors.tjmg.entidadeInput, mergedConfig.consulta.entidade, { delay: 50 });
			try {
				await page.waitForSelector(mergedConfig.selectors.tjmg.entidadeSuggestion, { timeout: 10000 });
				await randomDelay(500, 1000);
				await page.click(mergedConfig.selectors.tjmg.entidadeSuggestion);
				await randomDelay(1000, 2000);
			} catch {
				console.log("Não foi possível encontrar sugestões, continuando...");
			}

			if (mergedConfig.consulta.anoInicio) {
				if (progressCallback) progressCallback({ etapa: "preenchendo anoInicio", pageNumber });
				await page.evaluate(
					(selector, value) => {
						document.querySelector(selector).value = value;
					},
					mergedConfig.selectors.tjmg.anoInicioInput,
					mergedConfig.consulta.anoInicio,
				);
			}
			if (mergedConfig.consulta.anoFim) {
				if (progressCallback) progressCallback({ etapa: "preenchendo anoFim", pageNumber });
				await page.evaluate(
					(selector, value) => {
						document.querySelector(selector).value = value;
					},
					mergedConfig.selectors.tjmg.anoFimInput,
					mergedConfig.consulta.anoFim,
				);
			}

			if (progressCallback) progressCallback({ etapa: "consultando", pageNumber });
			console.log("Clicando no botão Consultar");
			await page.keyboard.press("Enter");

			if (progressCallback) progressCallback({ etapa: "aguardando resultados", pageNumber });
			console.log("Aguardando o carregamento dos resultados...");
			await page.waitForSelector(mergedConfig.selectors.tjmg.loadingIndicator, { hidden: true, timeout: 60000 });
			await page.waitForSelector(mergedConfig.selectors.tjmg.resultTable, { timeout: 20000 });
			console.log("Tabela de resultados carregada com sucesso!");

			console.log("Aguardando o carregamento da expansão de páginas...");
			await page.waitForSelector(mergedConfig.selectors.tjmg.loadingIndicator, { hidden: true, timeout: 60000 });
			await page.waitForSelector(mergedConfig.selectors.tjmg.resultTable, { timeout: 20000 });
			console.log("Tabela expandida carregada com sucesso!");

			// Se não for a primeira página, navega até a desejada
			if (pageNumber > 1) {
				for (let i = 1; i < pageNumber; i++) {
					if (progressCallback) progressCallback({ etapa: "indo para próxima página", pageNumber: i + 1 });
					const nextButton = await page.$(mergedConfig.selectors.tjmg.nextPageButton);
					if (nextButton) {
						await nextButton.click();
						await page.waitForSelector(mergedConfig.selectors.tjmg.loadingIndicator, {
							hidden: true,
							timeout: 60000,
						});
						await page.waitForSelector(mergedConfig.selectors.tjmg.resultTable, {
							visible: true,
							timeout: 20000,
						});
						await randomDelay(1000, 2000);
					} else {
						console.error('ERRO: O botão "Próxima Página" não foi encontrado.');
						break;
					}
				}
			}

			// aumenta itens por página, se houver seletor
			if (await page.$(mergedConfig.selectors.tjmg.paginatorSelection)) {
				await page.evaluate(
					(selector, value) => {
						const el = document.querySelector(selector);
						if (!el) return;
						el.value = value;
						const event = new Event("change", { bubbles: true });
						el.dispatchEvent(event);
					},
					mergedConfig.selectors.tjmg.paginatorSelection,
					"50",
				);
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));

			if (progressCallback) progressCallback({ etapa: "extraindo linhas", pageNumber });
			pageRowsData = await page.evaluate((columns) => {
				const rows = document.querySelectorAll("#resultado_data tr");
				const extractedData = [];

				for (const row of rows) {
					const cells = Array.from(row.querySelectorAll("td"));
					if (cells.length !== columns.length) continue;

					const obj = {};
					columns.forEach((col, idx) => {
						if (col === "empty") return;

						const cellText = cells[idx]?.textContent.trim() || "";

						if (col === "codigo") {
							const linkElement = cells[idx].querySelector('a[id$="nprecatorio"]');
							obj[col] = linkElement ? linkElement.textContent.trim() : cellText;
							obj.precatorioLinkId = linkElement ? linkElement.id : null;
						} else {
							obj[col] = cellText;
						}
					});

					extractedData.push(obj);
				}
				return extractedData;
			}, mergedConfig.columns);

			console.log(`Encontradas ${pageRowsData.length} linhas na página ${pageNumber}.`);

			// Garante exportId nas linhas
			pageRowsData = pageRowsData.map((r) => ({ ...r, exportId }));

			if (progressCallback) progressCallback({ etapa: "extraindo detalhes", pageNumber });
			let detailedData = [];

			for (let rowData of pageRowsData) {
				try {
					const details = await ScrapingService.extractPrecatorioDetails(page, rowData, mergedConfig);
					detailedData.push(details);
				} catch (error) {
					await exportRepo.createError(exportId, {
						message: `Erro ao extrair detalhes do precatório ${rowData.codigo}: ${error.message}`,
						stack: error.stack,
					});
				}
			}

			// Garante exportId também nos dados detalhados
			detailedData = detailedData.map((r) => ({ ...r, exportId }));

			if (progressCallback) progressCallback({ etapa: "extraindo detalhes PJE", pageNumber });

			detailedData = await ScrapingService.fetchPjeDetailsForTjmgRows(
				exportId,
				detailedData,
				browserService,
				progressCallback,
				mergedConfig,
			);

			await browserService.closePage(page);

			return detailedData;
		} catch (error) {
			if (page) await browserService.closePage(page);
			if (progressCallback) progressCallback({ etapa: "erro", pageNumber, error: error.message });
			console.error("Erro ao fazer scraping de uma página do TJMG:", error);
			return [];
		} finally {
			await browserService.closeBrowser();
		}
	}

	/**
	 * Realiza o scraping do TJMG (enfileira todas as páginas).
	 */
	static async scrapeTJMG(exportId, progressCallback) {
		console.log("Iniciando scraping do TJMG...");

		const exportRepo = new ExportRepository();
		const exportData = await exportRepo.getById(exportId);

		let page;
		let totalPages = 1;
		const browserService = new BrowserService();
		try {
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

			if (progressCallback) progressCallback({ etapa: "abrindo navegador", exportId });

			page = await browserService.newPage({ headless: exportData.headless });

			if (progressCallback) progressCallback({ etapa: "navegando", exportId });
			console.log(`Navegando para ${mergedConfig.urls.tjmg}`);
			await page.goto(mergedConfig.urls.tjmg, { waitUntil: "networkidle2" });

			if (progressCallback) progressCallback({ etapa: "preenchendo entidade", exportId });
			await page.waitForSelector(mergedConfig.selectors.tjmg.entidadeInput);
			await page.type(mergedConfig.selectors.tjmg.entidadeInput, mergedConfig.consulta.entidade, { delay: 50 });
			try {
				await page.waitForSelector(mergedConfig.selectors.tjmg.entidadeSuggestion, { timeout: 10000 });
				await randomDelay(500, 1000);
				await page.click(mergedConfig.selectors.tjmg.entidadeSuggestion);
				await randomDelay(1000, 2000);
			} catch {
				console.log("Não foi possível encontrar sugestões, continuando...");
			}

			if (mergedConfig.consulta.anoInicio) {
				if (progressCallback) progressCallback({ etapa: "preenchendo anoInicio", exportId });
				await page.evaluate(
					(selector, value) => {
						document.querySelector(selector).value = value;
					},
					mergedConfig.selectors.tjmg.anoInicioInput,
					mergedConfig.consulta.anoInicio,
				);
			}

			if (mergedConfig.consulta.anoFim) {
				if (progressCallback) progressCallback({ etapa: "preenchendo anoFim", exportId });
				await page.evaluate(
					(selector, value) => {
						document.querySelector(selector).value = value;
					},
					mergedConfig.selectors.tjmg.anoFimInput,
					mergedConfig.consulta.anoFim,
				);
			}

			if (progressCallback) progressCallback({ etapa: "consultando", exportId });
			await page.keyboard.press("Enter");

			if (progressCallback) progressCallback({ etapa: "aguardando resultados", exportId });
			console.log("Aguardando o carregamento dos resultados...");
			await page.waitForSelector(mergedConfig.selectors.tjmg.loadingIndicator, { hidden: true, timeout: 60000 });
			await page.waitForSelector(mergedConfig.selectors.tjmg.resultTable, { timeout: 20000 });
			console.log("Tabela de resultados carregada com sucesso!");

			// Ajusta paginação para 50, se existir
			if (await page.$(mergedConfig.selectors.tjmg.paginatorSelection)) {
				await page.evaluate(
					(selector, value) => {
						const el = document.querySelector(selector);
						if (!el) return;
						el.value = value;
						const event = new Event("change", { bubbles: true });
						el.dispatchEvent(event);
					},
					mergedConfig.selectors.tjmg.paginatorSelection,
					"50",
				);
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));

			console.log("Aguardando o carregamento da expansão de páginas...");
			await page.waitForSelector(mergedConfig.selectors.tjmg.loadingIndicator, { hidden: true, timeout: 60000 });
			await page.waitForSelector(mergedConfig.selectors.tjmg.resultTable, { timeout: 20000 });
			console.log("Tabela expandida carregada com sucesso!");

			try {
				await page.waitForSelector(mergedConfig.selectors.tjmg.paginatorCurrent, { timeout: 15000 });
				totalPages = await page.evaluate((selector) => {
					const paginatorText = document.querySelector(selector)?.textContent || "";
					const match = paginatorText.match(/Página \d+ de (\d+)/);
					return match ? Number(match[1]) : 1;
				}, mergedConfig.selectors.tjmg.paginatorCurrent);
				console.log(`Encontradas ${totalPages} páginas de resultados.`);
			} catch {
				console.log("Não foi encontrada paginação. Assumindo página única.");
				totalPages = 1;
			}

			if (mergedConfig.consulta.maxPages && mergedConfig.consulta.maxPages < totalPages) {
				totalPages = mergedConfig.consulta.maxPages;
			}
		} catch (error) {
			if (progressCallback) progressCallback({ etapa: "erro", exportId, error: error.message });
			console.error("Erro ao descobrir o total de páginas:", error);
			await exportRepo.createError(exportId, {
				message: "Erro ao descobrir o total de páginas: " + error.message,
				stack: error.stack,
			});
			throw error;
		} finally {
			if (page) await browserService.closePage(page);
			await browserService.closeBrowser();
		}

		for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
			if (progressCallback) progressCallback({ etapa: "disparando job página", exportId, pageNumber });
			await QueueService.addJob(JOB_NAMES.SCRAPE_SINGLE_TJMG_PAGE, {
				exportId: exportData.id,
				pageNumber,
			});
			console.log(`Job para página ${pageNumber} adicionado à fila.`);
		}

		if (progressCallback) progressCallback({ etapa: "jobs disparados", exportId, totalPages });

		await exportRepo.updateTotalPages(exportId, totalPages);

		return exportData;
	}

	/**
	 * Cria o export inicial e dispara o job de scraping completo.
	 */
	static async scrap(consulta) {
		const exportRepo = new ExportRepository();
		const exportData = await exportRepo.create({
			entity: consulta.entidade,
			yearStart: consulta.anoInicio,
			yearEnd: consulta.anoFim,
			maxPages: consulta.maxPages,
			hideClosed: consulta.ocultarFechados,
			headless: consulta.headless ?? true,
		});

		await QueueService.addJob(JOB_NAMES.SCRAPE_TJMG, { exportId: exportData.id });

		return exportData.id;
	}

	/**
	 * Para cada registro do TJMG, busca detalhes no PJE e preenche partyInfo.
	 */
	static async fetchPjeDetailsForTjmgRows(exportId, tjmgRows, browserService, progressCallback, config) {
		if (!Array.isArray(tjmgRows) || tjmgRows.length === 0) return [];

		const exportRepo = new ExportRepository();
		const processes = [];

		for (const row of tjmgRows) {
			processes.push(async () => {
				const numeroProcesso = row.numeroProcessoExecucao;
				console.log(`Buscando detalhes do PJE para o processo: ${numeroProcesso}`);

				if (!numeroProcesso) {
					row.partyInfo = [];
					return;
				}

				if (progressCallback) {
					progressCallback({
						etapa: "buscando detalhes PJE",
						numeroProcesso,
						descricao: `Buscando detalhes do processo ${numeroProcesso} no PJE...`,
					});
				}

				let partyInfo = [];

				try {
					partyInfo = await ScrapingService._fetchPjePartyInfo(browserService, numeroProcesso, config);
				} catch (error) {
					await exportRepo.createError(exportId, {
						message: `Erro ao buscar detalhes do PJE para o processo ${numeroProcesso}: ${error.message}`,
						stack: error.stack,
					});
				}

				row.partyInfo = partyInfo || [];
				await randomDelay(500, 1200);
			});
		}

		await runWithConcurrencyLimit(processes, 5);

		return tjmgRows;
	}

	/**
	 * Busca detalhes das partes de um processo no PJE.
	 * Usa seletor mais robusto, independente do prefixo j_idXXX.
	 */
	static async _fetchPjePartyInfo(browserService, numeroProcesso, config) {
		const numeroProcessoLimpo = numeroProcesso.replace(/\D/g, "");
		if (!numeroProcessoLimpo || numeroProcessoLimpo.length < 5) {
			console.log(`[PJE] Processo inválido ou muito curto: ${numeroProcesso}`);
			return [];
		}

		let page = null;
		try {
			page = await browserService.newPage({ headless: config.browser.headless });

			// Tela principal do PJE
			await page.goto(config.urls.pje, { waitUntil: "networkidle2" });

			// Se não tiver 20 dígitos, usa pesquisa livre
			if (numeroProcessoLimpo.length !== 20) {
				await page.waitForSelector(config.selectors.pje.livreRadioButton);
				await page.click(config.selectors.pje.livreRadioButton);
			}

			await page.waitForSelector(config.selectors.pje.processoInput);
			await page.type(
				config.selectors.pje.processoInput,
				applyProcessMask(numeroProcessoLimpo),
				{ delay: 50 },
			);
			await page.keyboard.press("Enter");

			// Ver detalhes
			try {
				await page.waitForSelector(config.selectors.pje.verDetalhesLink, { timeout: 5000 });
			} catch {
				console.log(`[PJE] Nenhum resultado encontrado para o processo ${numeroProcesso}.`);
				return [];
			}

			const onclickAttribute = await page.$eval(
				config.selectors.pje.verDetalhesLink,
				(el) => el.getAttribute("onclick"),
			);
			const urlMatch = onclickAttribute.match(/'([^']+\.seam[^']+)'/);

			if (!urlMatch || !urlMatch[1]) {
				console.log("[PJE] Não foi possível extrair a URL de detalhes do processo.");
				return [];
			}

			const relativeUrl = urlMatch[1];
			const fullUrl = new URL(relativeUrl, config.urls.pje).href;
			await page.goto(fullUrl, { waitUntil: "networkidle2" });

			// ID dinâmico: pega qualquer elemento cujo id termine com esse sufixo
			const containerSelector = '[id$="processoPartesPoloAtivoResumidoList"]';

			try {
				await page.waitForSelector(containerSelector, { timeout: 60000 });
			} catch {
				console.log(
					`[PJE] Container de partes não encontrado para o processo ${numeroProcesso} (layout diferente ou sem partes).`,
				);
				return [];
			}

			const parties = await page.evaluate((selector) => {
				const root = document.querySelector(selector);
				if (!root) return [];

				const rows = Array.from(
					root.querySelectorAll(".pje-parte-processual, tr"),
				);
				const parties = [];
				let currentAuthor = null;

				rows.forEach((row) => {
					const nameElement =
						row.querySelector("span.text-bold") || row.querySelector("span");
					if (!nameElement) return;

					const nameText = nameElement.textContent.trim();
					const roleMatch = nameText.match(/\((.*?)\)/);
					if (!roleMatch) return;

					const nameMatch = nameText.match(/^(.*?)-/);
					const cpfMatch = nameText.match(/(?:CPF|CNPJ):\s*([\d./-]+)/);
					const oabMatch = nameText.match(/OAB\s*([A-Z]{2}\d+)/);

					const name = nameMatch ? nameMatch[1].trim() : nameText.split("(")[0].trim();
					const cpf = cpfMatch ? cpfMatch[1].trim() : "";
					const role = roleMatch ? roleMatch[1].trim() : "";
					const oab = oabMatch ? oabMatch[1].trim() : "";

					if (role !== "ADVOGADO") {
						currentAuthor = { name, cpf_cnpj: cpf, role, lawyers: "" };
						parties.push(currentAuthor);
					} else if (role === "ADVOGADO" && currentAuthor) {
						const lawyerInfo = `${name} (OAB: ${oab || "N/A"})`;
						currentAuthor.lawyers += currentAuthor.lawyers
							? `; ${lawyerInfo}`
							: lawyerInfo;
					}
				});

				return parties;
			}, containerSelector);

			console.log(`[PJE] Partes extraídas para ${numeroProcesso}: ${JSON.stringify(parties)}`);
			return parties;
		} catch (err) {
			console.error(`[PJE] Erro ao buscar detalhes do processo ${numeroProcesso}:`, err);
			return [];
		} finally {
			// se quiser pode fechar a aba aqui:
			// if (page && !page.isClosed()) await page.close();
		}
	}
}
