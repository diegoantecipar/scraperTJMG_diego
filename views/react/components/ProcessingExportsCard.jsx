import { useQuery } from "@tanstack/react-query";
import api from "../api";
import { isEqual } from "../utils";

function ProcessingExportsCard() {
	const { data, error } = useQuery({
		queryKey: ["processingExports"],
		queryFn: async () => {
			const res = await api.get("/status");
			return res.data;
		},
		keepPreviousData: true,
		refetchInterval: 5000,
		select: (newData, prevData) => {
			if (prevData && isEqual(newData, prevData)) {
				return prevData;
			}
			return newData;
		},
	});

	if (error) return <div className="text-red-500 p-4">Erro ao carregar exports em processamento.</div>;
	if (!data || data.length === 0) return <div className="text-gray-500 p-4">Nenhum export em processamento.</div>;

	return (
		<div>
			{data.map((exp) => (
				<div key={exp.exportId} className="mb-4 p-4 border border-gray-300 rounded-lg">
					<div className="flex justify-between items-center">
						<div>
							<strong>Export:</strong> {exp.exportId}
							<span className="ml-2 text-xs text-gray-500">
								{exp.complete
									? "Completo"
									: `Processando ${exp.totalPages ? `${exp.totalPages} páginas` : ""} `}
							</span>
						</div>
						<div>
							<strong>{exp.totalProcessedPages}</strong> páginas processadas (
							{exp.failures.filter((f) => f.page).length} falhas)
						</div>
					</div>
					<div className="w-full bg-gray-200 rounded-full h-2 mt-2">
						<div
							className="bg-primary h-2 rounded-full"
							style={{
								width: `${(exp.totalProcessedPages / (exp.totalPages || 1)) * 100}%`,
							}}
						></div>
					</div>
					{exp.failures.length > 0 && (
						<div className="mt-2 text-xs text-red-600">
							<p>Falhas ({exp.failures.length}):</p>
							{exp.failures.map((f) => (
								<p key={`${f.page ?? Math.random()}-${Math.random()}-${f.reason}`}>
									Página {f.page ?? "não definida"}: {f.reason}
								</p>
							))}
						</div>
					)}
					{exp.errors.length > 0 && (
						<div className="mt-2 text-xs text-red-600">
							<p>Erros ({exp.errors.length}):</p>
							{exp.errors.map((e, index) => (
								<p key={index}>
									{e.error ?? e.stack.slice(0, 100) + "..."} <br />
									{/* <pre className="text-xs">{e.stack}</pre> */}
								</p>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}
export default ProcessingExportsCard;
