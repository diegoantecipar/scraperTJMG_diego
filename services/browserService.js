import puppeteer from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteerExtra from "puppeteer-extra";
import config from "../config.js";

puppeteerExtra.use(StealthPlugin());

export class BrowserService {
	browser = null;

	defaultOptions = {
		headless: true,
		// executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
		defaultViewport: {
			width: config.browser.width,
			height: config.browser.height,
		},
		humanBehavior: {
			...config.humanBehavior,
		},
		...(process.env.NODE_ENV === "production" && {
			executablePath: "/usr/bin/google-chrome", // Caminho do Chrome do sistema
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-accelerated-2d-canvas",
				"--no-first-run",
				"--no-zygote",
				"--disable-gpu",
				"--disable-background-timer-throttling",
				"--disable-backgrounding-occluded-windows",
				"--disable-renderer-backgrounding",
			],
		}),
	};

	/**
	 * Inicializa o browser Puppeteer com Stealth (singleton).
	 * @param {object} options - Opções do Puppeteer (sobrescreve padrão)
	 * @returns {Promise<puppeteer.Browser>}
	 */
	async getBrowser(options = {}) {
		if (!this.browser) {
			const mergedOptions = { ...this.defaultOptions, ...options };
			// Mescla defaultViewport e args corretamente
			if (options.defaultViewport) {
				mergedOptions.defaultViewport = {
					...this.defaultOptions.defaultViewport,
					...options.defaultViewport,
				};
			}
			if (options.args) {
				mergedOptions.args = { ...options.args };
			}
			this.browser = await puppeteerExtra.launch(mergedOptions);
			// this.browser = await puppeteerExtra.launch({ ...mergedOptions, headless: false });
		}
		return this.browser;
	}

	/**
	 * Cria uma nova aba (page) no browser.
	 * @param {object} options - Opções do Puppeteer (usado apenas se o browser ainda não foi iniciado)
	 * @returns {Promise<puppeteer.Page>}
	 */
	async newPage(options = {}) {
		const browser = await this.getBrowser(options);
		const page = await browser.newPage();
		await page.setUserAgent(config.browser.userAgent);
		await page.setDefaultNavigationTimeout(config.browser.timeout);

		return page;
	}

	/**
	 * Fecha uma aba específica.
	 * @param {puppeteer.Page} page
	 */
	async closePage(page) {
		if (page && !page.isClosed()) {
			await page.close();
		}
	}

	/**
	 * Fecha todas as abas abertas (exceto a primeira, se desejar).
	 */
	async closeAllPages() {
		if (this.browser) {
			const pages = await this.browser.pages();
			await Promise.all(pages.map((page, idx) => (idx === 0 ? Promise.resolve() : page.close())));
		}
	}

	async closeBrowser() {
		if (this.browser) {
			await this.browser.close();
			this.browser = null;
		}
	}
}
