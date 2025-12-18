import { useEffect, useState } from "react";
import api from "../api";
import { useToast } from "../Context";

export default function WebhookForm() {
	const [editing, setEditing] = useState({ main: false, error: false });
	const [url, setUrl] = useState({ main: "", error: "" });
	const [loading, setLoading] = useState({ main: false, error: false });

	useEffect(() => {
		const fetchWebhookUrls = async () => {
			const response = await api.get("/webhook");
			setUrl({
				main: response.data.url || "",
				error: response.data.errorUrl || "",
			});
		};
		fetchWebhookUrls();
	}, []);

	const { show } = useToast();

	const handleEdit = (type) => setEditing((e) => ({ ...e, [type]: true }));

	const handleChange = (type, value) => setUrl((u) => ({ ...u, [type]: value }));

	const handleSubmit = async (e, type) => {
		e.preventDefault();
		if (!url[type]) return;

		setLoading((l) => ({ ...l, [type]: true }));
		const response = await api.post("/webhook", {
			[type === "main" ? "url" : "errorUrl"]: url[type],
		});
		setLoading((l) => ({ ...l, [type]: false }));

		if (response.status !== 200) {
			show("Erro ao atualizar webhook. Tente novamente.", "error");
			return;
		}
		setEditing((e) => ({ ...e, [type]: false }));
		show("Webhook URL atualizada com sucesso!", "success");
	};

	return (
		<>
			<label htmlFor="webhook-url-main">URL do webhook</label>
			<div className="flex items-center gap-2 mb-2 mt-2">
				<input
					type="url"
					id="webhook-url-main"
					value={url.main}
					onChange={(e) => handleChange("main", e.target.value)}
					disabled={!editing.main || loading.main}
					placeholder="URL do webhook"
					className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
				/>
				{editing.main ? (
					<button
						type="submit"
						disabled={loading.main}
						className="bg-success hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-success disabled:bg-gray-400 disabled:cursor-not-allowed"
						onClick={(e) => handleSubmit(e, "main")}
					>
						{loading.main ? "Salvando..." : "Salvar"}
					</button>
				) : (
					<button
						type="button"
						onClick={() => handleEdit("main")}
						className="bg-primary hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
					>
						Alterar
					</button>
				)}
			</div>
			<label htmlFor="webhook-url-error">URL do webhook para erros</label>
			<div className="flex items-center gap-2 mt-2">
				<input
					type="url"
					id="webhook-url-error"
					value={url.error}
					onChange={(e) => handleChange("error", e.target.value)}
					disabled={!editing.error || loading.error}
					placeholder="URL do webhook para erros"
					className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
				/>
				{editing.error ? (
					<button
						type="submit"
						disabled={loading.error}
						className="bg-success hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-success disabled:bg-gray-400 disabled:cursor-not-allowed"
						onClick={(e) => handleSubmit(e, "error")}
					>
						{loading.error ? "Salvando..." : "Salvar"}
					</button>
				) : (
					<button
						type="button"
						onClick={() => handleEdit("error")}
						className="bg-primary hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
					>
						Alterar
					</button>
				)}
			</div>
		</>
	);
}
