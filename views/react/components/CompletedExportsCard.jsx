import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "../api";
import { isEqual } from "../utils";

function CompletedExportsCard() {
	const [page, setPage] = useState(1);
	const pageSize = 5;
	const { data, error } = useQuery({
		queryKey: ["completedExports", page],
		queryFn: async () => {
			const res = await api.get(`/exports?page=${page}&pageSize=${pageSize}`);
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

	if (error) return <div className="text-red-500 p-4">Erro ao carregar exports completos.</div>;
	if (!data || !data.exports || data.exports.length === 0)
		return <div className="text-gray-500 p-4">Nenhum export completo encontrado.</div>;

	const Pagination = () => (
		<div className="flex justify-center mt-2 mb-4 gap-2">
			<button
				disabled={data.page <= 1}
				className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
				onClick={() => setPage((p) => Math.max(1, p - 1))}
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<span className="px-3 py-1">
				{data.page} / {data.totalPages}
			</span>
			<button
				disabled={data.page >= data.totalPages}
				className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
				onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		</div>
	);

	const handleDownload = async (exportId) => {
		try {
			const res = await api.get(`/download/${exportId}`, {
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", `export_${exportId}.json`);
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (err) {
			alert("Erro ao baixar arquivo.");
		}
	};

	return (
		<>
			<Pagination />
			{data.exports.map((exp) => (
				<div
					key={exp.exportId}
					className="mb-4 p-4 border border-gray-300 rounded-lg flex justify-between items-center"
				>
					<div>
						<strong>ID:</strong> {exp.exportId} <br />
						Entidade: <span className="font-mono">{exp.entity}</span> <br />
						Período: {exp.yearStart} - {exp.yearEnd} <br />
						Criado em: {new Date(exp.createdAt).toLocaleString()} <br />
						<span className="text-xs text-gray-700">
							<strong>Sucesso:</strong>{" "}
							{(exp.totalPages || 0) - (exp.failures.filter((f) => f.page).length || 0)} &nbsp;|&nbsp;
							<strong>Falhas:</strong> {exp.failures?.filter((f) => f.page).length || 0} |{" "}
							<strong>Erros:</strong> {exp.failures?.length || 0}
						</span>
						{/* Razão das falhas */}
						{exp.failures && exp.failures.length > 0 && (
							<div className="mt-2 text-xs text-red-600">
								<strong>Razões de falha:</strong>
								<ul className="list-disc ml-5">
									{exp.failures.map((f, idx) => (
										<li key={idx}>
											{f.page ? `Página ${f.page}:` : ""} {f.reason}
										</li>
									))}
								</ul>
							</div>
						)}
						{exp.errors && exp.errors.length > 0 && (
							<div className="mt-2 text-xs text-red-600">
								<strong>Erros:</strong>
								<ul className="list-disc ml-5">
									{exp.errors.map((e, idx) => (
										<li key={idx}>
											{e.error ?? e.stack.slice(0, 100) + "..."} <br />
											{/* <pre className="text-xs">{e.stack}</pre> */}{" "}
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
					<button
						type="button"
						onClick={() => handleDownload(exp.exportId)}
						className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700 transition flex items-center gap-2 cursor-pointer"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
						</svg>
						Download JSON
					</button>
				</div>
			))}
			<Pagination />
		</>
	);
}

export default CompletedExportsCard;
