import fs from "fs/promises";
import path from "path";

const OUTPUT_DIR = path.resolve("output");

export class FileService {
	async upload(jsonData, filename, exportId) {
		const exportDir = path.join(OUTPUT_DIR, String(exportId));
		await fs.mkdir(exportDir, { recursive: true });
		const filePath = path.join(exportDir, filename.endsWith(".json") ? filename : `${filename}.json`);
		const jsonString = JSON.stringify(jsonData, null, 2);
		await fs.writeFile(filePath, jsonString, "utf8");
		return filePath;
	}

	async list() {
		await fs.mkdir(OUTPUT_DIR, { recursive: true });
		const files = await fs.readdir(OUTPUT_DIR);
		return files.map((name) => ({
			name,
			path: path.join(OUTPUT_DIR, name),
		}));
	}

	async get(filename) {
		const filePath = path.join(OUTPUT_DIR, filename);
		try {
			const data = await fs.readFile(filePath);
			return data;
		} catch (err) {
			if (err.code === "ENOENT") return null;
			throw err;
		}
	}

	async delete(filename) {
		const filePath = path.join(OUTPUT_DIR, filename);
		try {
			await fs.unlink(filePath);
			return true;
		} catch (err) {
			if (err.code === "ENOENT") return false;
			throw err;
		}
	}
}
