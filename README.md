# Scraper TJMG e PJE

Script automatizado para extrair dados de precatórios do Tribunal de Justiça de Minas Gerais (TJMG) e do sistema de Processo Judicial Eletrônico (PJE).

## Requisitos

-   Node.js (v14 ou superior)
-   npm

## Instalação

1. Clone o repositório
2. Instale as dependências:

```bash
npm install
```

## Como Usar

### Levantar o docker para funcionar fila

```bash
docker-compose up -d
```

### Boot do banco de dados:

```bash
npm run migrate
```

```bash
npm run seed
```

### Boot do painel e do backend:

```bash
npm run dev
```

Acessível em `http://localhost:5173`

### Executar fila:

```bash
npm run workers
```

Necessário docker rodando redis para funcionamento da fila
