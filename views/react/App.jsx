import { useState, useEffect } from "react";
import ScrapeForm from "./components/ScrapeForm";
import { ConfigContext, ToastProvider } from "./Context";
import ProcessingExportsCard from "./components/ProcessingExportsCard";
import CompletedExportsCard from "./components/CompletedExportsCard";
import api from "./api";
import WebhookForm from "./components/WebhookForm";

function App() {
	const [config, setConfig] = useState(null);

	useEffect(() => {
		api.get("/config")
			.then((res) => setConfig(res.data))
			.catch(() => setConfig(null));
	}, []);

	return (
		<ConfigContext.Provider value={config}>
			<ToastProvider>
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-8">
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Configuração de webhook</h2>
						<WebhookForm />
					</div>
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Nova Consulta</h2>
						<ScrapeForm />
					</div>
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Exports em Processamento</h2>
						<ProcessingExportsCard />
					</div>
					<div className="bg-white rounded-xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">Exports Completos</h2>
						<CompletedExportsCard />
					</div>
				</div>
			</ToastProvider>
		</ConfigContext.Provider>
	);
}

export default App;
