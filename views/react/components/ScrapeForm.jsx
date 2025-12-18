import { useEffect, useState } from "react";
import { useConfig, useToast } from "../Context";
import api from "../api";

function ScrapeForm() {
	const config = useConfig();

	const [form, setForm] = useState({
		entidade: "",
		anoInicio: "",
		anoFim: "",
		ocultarFechados: false,
		maxPages: "",
		headless: true,
	});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (config) {
			setForm((f) => ({
				...f,
				// entidade: config.consulta.entidade || "",
				// anoInicio: config.consulta.anoInicio || "",
				// anoFim: config.consulta.anoFim || "",
				ocultarFechados: config.consulta.ocultarFechados ?? true,
				// maxPages: config.consulta.maxPages || "",
				headless: config.browser?.headless ?? true,
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [config]);

	const { show } = useToast();

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target;
		setForm((f) => ({
			...f,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		try {
			const res = await api.post("/scrape", form);
			const json = res.data;
			if (res.status === 200) {
				show("Scraping iniciado com sucesso!", "success");
			} else {
				show(json.message || "Erro ao iniciar scraping.", "error");
			}
		} catch {
			show("Erro ao iniciar scraping.", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			<div>
				<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
					<svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					Consulta
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label htmlFor="entidade" className="block text-sm font-medium text-gray-700 mb-2">
							Entidade
						</label>
						<input
							type="text"
							id="entidade"
							name="entidade"
							value={form.entidade}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
						/>
					</div>
					<div>
						<label htmlFor="maxPages" className="block text-sm font-medium text-gray-700 mb-2">
							Máximo de Páginas
							<span
								className="ml-1 text-sm text-gray-400 cursor-pointer"
								title="Caso ficar em branco, o crawler buscará todas as páginas"
							>
								&#9432;
							</span>
						</label>
						<input
							type="number"
							id="maxPages"
							name="maxPages"
							value={form.maxPages}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
						/>
					</div>
					<div>
						<label htmlFor="anoInicio" className="block text-sm font-medium text-gray-700 mb-2">
							Ano Início
						</label>
						<input
							type="text"
							id="anoInicio"
							name="anoInicio"
							value={form.anoInicio}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
						/>
					</div>
					<div>
						<label htmlFor="anoFim" className="block text-sm font-medium text-gray-700 mb-2">
							Ano Fim
						</label>
						<input
							type="text"
							id="anoFim"
							name="anoFim"
							value={form.anoFim}
							onChange={handleChange}
							className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
						/>
					</div>
					<div className="md:col-span-2">
						<div className="flex items-center">
							<input
								type="checkbox"
								id="ocultarFechados"
								name="ocultarFechados"
								checked={form.ocultarFechados}
								onChange={handleChange}
								className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
							/>
							<label htmlFor="ocultarFechados" className="ml-2 block text-sm text-gray-900">
								Ocultar Fechados
							</label>
						</div>
					</div>
				</div>
			</div>
			{/* <div>
				<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
					<svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
						/>
					</svg>
					Navegador
				</h2>
				<div className="flex items-center">
					<input
						type="checkbox"
						id="headless"
						name="headless"
						checked={form.headless}
						onChange={handleChange}
						className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
					/>
					<label htmlFor="headless" className="ml-2 block text-sm text-gray-900">
						Modo Headless
					</label>
				</div>
			</div> */}
			<div className="flex justify-end">
				<button
					id="run-button"
					type="submit"
					disabled={loading}
					className="bg-success hover:bg-green-600 text-white font-medium py-3 px-8 rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-success disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
				>
					<span className="flex items-center">
						<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
							<path d="M6.5 5.5v9l7-4.5-7-4.5z" />
						</svg>
						{loading ? "Enviando..." : "Executar Scraper"}
					</span>
				</button>
			</div>
		</form>
	);
}

export default ScrapeForm;
