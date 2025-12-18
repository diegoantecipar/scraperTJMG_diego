import fs from "fs";
import path from "path";

try {
	// Lê o arquivo JSON
	// C:\Users\Vitor\Downloads\export_1 (1).json
	const data = fs.readFileSync(path.join("C:", "Users", "Vitor", "Downloads", "export_1 (1).json"), "utf8");

	// Converte para objeto JavaScript
	const array = JSON.parse(data);

	// Verifica se é um array e mostra o tamanho
	if (Array.isArray(array)) {
		console.log(`O array tem ${array.length} elementos`);
	} else {
		console.log("O arquivo não contém um array");
	}
} catch (error) {
	console.error("Erro ao ler o arquivo:", error.message);
}
