/**
 * Arquivo de utilidades para os scripts de scraping
 */

import fs from "fs/promises";
import axios from "axios";

/**
 * Lê um arquivo JSON e retorna seu conteúdo como objeto JavaScript
 * @param {string} filePath - Caminho do arquivo JSON
 * @returns {Promise<Object|Array|null>} - Conteúdo do arquivo JSON ou null em caso de erro
 */
export async function readJsonFile(filePath) {
	try {
		const data = await fs.readFile(filePath, "utf8");
		return JSON.parse(data);
	} catch (error) {
		console.error(`Error reading JSON file ${filePath}:`, error.message);
		return null;
	}
}

/**
 * Escreve um objeto JavaScript em um arquivo JSON
 * @param {string} filePath - Caminho do arquivo JSON
 * @param {Object|Array} data - Dados a serem escritos
 * @param {boolean} pretty - Se true, formata o JSON com indentação
 * @returns {Promise<boolean>} - true se a operação foi bem-sucedida, false caso contrário
 */
export async function writeJsonFile(filePath, data, pretty = true) {
	try {
		const jsonData = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
		await fs.writeFile(filePath, jsonData);
		return true;
	} catch (error) {
		console.error(`Error writing JSON file ${filePath}:`, error.message);
		return false;
	}
}

/**
 * Adiciona um objeto a um arquivo JSON existente
 * @param {string} filePath - Caminho do arquivo JSON
 * @param {Object} newObject - Objeto a ser adicionado
 * @returns {Promise<boolean>} - true se a operação foi bem-sucedida, false caso contrário
 */
export async function appendToJsonFile(filePath, newObject) {
	try {
		const data = await readJsonFile(filePath);
		if (data && Array.isArray(data)) {
			data.push(newObject);
			return await writeJsonFile(filePath, data);
		} else {
			return await writeJsonFile(filePath, [newObject]);
		}
	} catch (error) {
		console.error(`Error appending to JSON file ${filePath}:`, error.message);
		return false;
	}
}

/**
 * Aplica máscara ao número do processo
 * @param {string} input - Número do processo sem formatação
 * @returns {string} - Número do processo formatado
 */
export function applyProcessMask(input) {
	// Remove qualquer caractere não numérico
	let cleaned = input.replace(/\D/g, "");
	// Aplica a máscara
	return cleaned.replace(/(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})/, "$1-$2.$3.$4.$5.$6");
}

/**
 * Gera um atraso aleatório para simular comportamento humano
 * @param {number} min - Tempo mínimo em milissegundos
 * @param {number} max - Tempo máximo em milissegundos
 * @returns {Promise<void>}
 */
export async function randomDelay(min = 500, max = 2000) {
	const delay = Math.floor(Math.random() * (max - min) + min);
	return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Formata uma data no formato brasileiro (DD/MM/YYYY)
 * @param {Date} date - Objeto Date
 * @returns {string} - Data formatada
 */
export function formatDate(date) {
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	return `${day}/${month}/${year}`;
}

/**
 * Formata um valor monetário no formato brasileiro (R$ 0.000,00)
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado
 */
export function formatCurrency(value) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(value);
}

/**
 * Executa funções async em paralelo, limitando a concorrência a `limit`.
 * @param {Array<Function>} tasks - Array de funções async (cada uma retorna uma Promise)
 * @param {number} limit - Número máximo de execuções simultâneas
 * @returns {Promise<Array>} - Array de resultados na ordem das funções
 */
export async function runWithConcurrencyLimit(tasks, limit) {
	const results = [];
	let running = 0;
	let current = 0;

	return new Promise((resolve, reject) => {
		function runNext() {
			if (current >= tasks.length && running === 0) {
				return resolve(results);
			}
			while (running < limit && current < tasks.length) {
				const idx = current++;
				running++;
				tasks[idx]()
					.then((res) => {
						results[idx] = res;
					})
					.catch((err) => {
						results[idx] = err;
					})
					.finally(() => {
						running--;
						runNext();
					});
			}
		}
		runNext();
	});
}
