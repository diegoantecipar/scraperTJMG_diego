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

      // Tabela de resultados e paginação
      resultTable: '.ui-datatable',
      paginatorCurrent: '.ui-paginator-current',
      paginatorSelection: '#formResultado\\:listView_rppDD',
      nextPageButton: '.ui-paginator-next',
      loadingIndicator: '.ui-state-loading-indicator', // Configuração do AJAX
      dialogDetalhe: '.ui-dialog-content',
      fecharDialogButton: '.close-dialog-button',
    },
  },
};
