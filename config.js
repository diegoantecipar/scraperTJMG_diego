// config.js (raiz do projeto)
// Versão robusta para o TJMG "consultaPorEntidadeDevedora.jsf" + PJE (consulta pública)

export default {
  urls: {
    tjmg: "https://www8.tjmg.jus.br/juridico/pe/consultaPorEntidadeDevedora.jsf",
    // Mantive a URL que seu scrapingService já está usando (listView.seam).
    pje: "https://pje.tjmg.jus.br/pje/ConsultaPublica/listView.seam",
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

  /**
   * Seletores:
   * - Muitos ids do JSF/PrimeFaces podem mudar prefixo, mas normalmente mantêm sufixos.
   * - Por isso, usei padrões com [id$="..."] (termina com) e alguns fallbacks.
   */
  selectors: {
    tjmg: {
      // Campo "Entidade Devedora" (há variações de id dependendo do layout)
      entidadeInput:
        'input[id$="selEntesDevedores_input"], input[id$="entidade_devedora_input"]',


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

      // Item do autocomplete (alguns temas usam li.ui-autocomplete-item, outros li direto)
      entidadeSuggestion:
        "li.ui-autocomplete-item, .ui-autocomplete-items li",

      // Campos de ano (podem ser _input no PrimeFaces)
      anoInicioInput: 'input[id$="anoInicio_input"], input[id$="anoInicio"]',
      anoFimInput: 'input[id$="anoFim_input"], input[id$="anoFim"]',

      // Botão consultar (em vários layouts o id termina com ":consultar")
      consultarButton:
        'button[id$="consultar"], button[id$=":consultar"], button[id*="consultar"]',

      // Indicador de loading (PrimeFaces costuma usar esses)
      loadingIndicator:
        ".ui-blockui, .ui-widget-overlay, .ui-datatable-loading, .ui-overlay-visible",

      /**
       * Tabela de resultados:
       * Seu scrapingService já lê as linhas assim:
       *   document.querySelectorAll("#resultado_data tr")
       * então garantimos esse seletor como principal.
       */
      resultTable: '#resultado, table[id$="resultado"]',
      resultRows: "#resultado_data tr, table[id$='resultado'] tbody tr",

      // Paginação (comuns no PrimeFaces)
      paginatorSelection:
        'select[id$="dataTablePrecat_rppDD"], .ui-paginator-rpp-options, select.ui-paginator-rpp-options',
      paginatorCurrent:
        ".ui-paginator-current, span.ui-paginator-current",
      nextPageButton:
        ".ui-paginator-next, button.ui-paginator-next, a.ui-paginator-next",

      // Detalhe do precatório (dialog)
      dialogDetalhe:
        '#idDialogDetalhe, [id$="idDialogDetalhe"], .ui-dialog:has(.ui-dialog-content)',
      dialogContent:
        ".ui-dialog-content, .ui-dialog .ui-dialog-content",

      // Campos dentro do diálogo (sufixos costumam se manter)
      valorFaceLabel: 'span[id$="valorFace"], span[id$="valorFace_label"]',
      dataAtualizacaoValorFaceLabel:
        'span[id$="liquidacao"], span[id$="dataAtualizacaoValorFace"], span[id$="dataAtualizacaoValorFace_label"]',
      acaoLabel: 'span[id$="acao"], span[id$="acao_label"]',

      // Botão fechar (padrões comuns PrimeFaces)
      fecharDialogButton:
        'button[title="Fechar"], a[title="Fechar"], button.ui-dialog-titlebar-close',
    },

    pje: {
      // Consulta pública: busca "livre" e campo do processo
      livreRadioButton:
        'input#fPP\\:cbPesquisaLivre, input[id$="cbPesquisaLivre"]',
      processoInput:
        'input#fPP\\:numeroProcesso\\:input, input[id$="numeroProcesso:input"], input[id$="inputNumeroProcesso"], input[id*="numeroProcesso"]',
      verDetalhesLink:
        'a[onclick*="listView.seam"], a[href*="listView.seam"]',
    },
  },

  /**
   * Colunas da tabela do TJMG
   * (tem que bater com o que seu scrapingService espera na extração)
   */
  columns: [
    "enteDevedor",
    "precatorio",
    "natureza",
    "nSei",
    "dataProtocolo",
    "dataLiquidacao",
    "credor",
    "situacao",
    "numeroProcessoExecucao",
    "empty",
  ],
};
