export const formatData = (data) => {
	return data.map((item) => {
		const author =
			item.partyInfo && item.partyInfo.length > 0
				? item.partyInfo.find((p) => p.role === "REQUERENTE") || item.partyInfo[0]
				: { name: "", role: "", lawyers: "" };

		const formattedItem = {
			"Credor Principal:": item.credorPrincipal || (author ? author.name : ""),
			"Número e Natureza do Precatório:": `Precatório nº ${item.codigo} - ${item.natureza}`,
			"Ano de Vencimento:": item.vencimento || "",
			"Situação:": item.situacao || "",
			"Valor de formação do Precatório (Valor de Face):": item.valorFace || "",
			"Data da última atualização do Valor de Face (Data de Liquidação):": item.dataAtualizacaoValorFace || "",
			"Protocolo (Data/Hora):": item.dataLiquidacao || "",
			"Processo de Execução nº:": item.numeroProcessoExecucao || "",
			"Processo SEI nº:": item.numeroSei || "",
			"Origem:": item.origem || "TJMG",
			"Ação:": item.acao || "",
			processed: true,
			name: author.name,
			role: author.role,
			lawyers: author.lawyers,
		};
		return formattedItem;
	});
};
