export default {
  urls: {
    tjmg: 'https://www8.tjmg.jus.br/juridico/pe/consultaPorEntidadeDevedora.jsf',
    pje: 'https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam',
  },

  browser: {
    headless: true,
    defaultTimeout: 60000,
    slowMo: 25,
  },

  humanBehavior: {
    minDelay: 400,
    maxDelay: 1200,
  },

  // 🔍 Novos seletores do TJMG (layout atualizado em 2024/2025)
  selectors: {
    tjmg: {
      // Campos de consulta
      entidadeInput: '#formResultado\\:selEntesDevedores_input',
      entidadeSuggestion: '.ui-autocomplete-items li',
      anoInicioInput: '#formResultado\\:anoInicio_input',
      anoFimInput: '#formResultado\\:anoFim_input',
      consultarButton: '#formResultado\\:btnConsultar',

      // Indicadores e tabela de resultado
      loadingIndicator: '.ui-datatable-loading, .ui-overlay-visible',
      resultTable: '#formResultado\\:dataTablePrecat',
      resultRows: '#formResultado\\:dataTablePrecat_data tr',

      // Paginação
      paginatorSelection: '#formResultado\\:dataTablePrecat_rppDD',
      paginatorCurrent:
        '#formResultado\\:dataTablePrecat_paginator_bottom .ui-paginator-current',
      nextPageButton:
        '#formResultado\\:dataTablePrecat_paginator_bottom .ui-paginator-next',

      // Diálogo de detalhes do precatório
      dialogDetalhe: '.ui-dialog-content',
      valorFaceLabel: 'span[id$="valorFace_label"]',
      dataAtualizacaoValorFaceLabel: 'span[id$="dataAtualizacaoValorFace_label"]',
      acaoLabel: 'span[id$="acao_label"]',
      fecharDialogButton: 'button[title="Fechar"]',
    },

    // Se ainda estiver usando scraping do PJE
    pje: {
      livreRadioButton: '#fPP\\:cbPesquisaLivre',
      processoInput: '#fPP\\:numeroProcesso:input',
      verDetalhesLink: 'a[onclick*="listView.seam"]',
    },
  },

  // 🧱 Colunas da tabela de resultados
  columns: [
    'enteDevedor',
    'precatorio',
    'natureza',
    'nSei',
    'dataProtocolo',
    'dataLiquidacao',
    'credor',
    'situacao',
    'numeroProcessoExecucao',
    'empty',
  ],
};
