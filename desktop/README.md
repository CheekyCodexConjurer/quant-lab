# Desktop shell do The Lab (Electron)

Este diretório contém o **shell desktop Electron** do The Lab,
permitindo empacotar o frontend (React/Vite) e o backend local (Express)
em uma experiência de app nativo, similar a TradingView Desktop / ChatGPT Desktop.

Estado atual (Fase 0.x do roadmap):

- Tecnologia escolhida: **Electron** (entrypoint `desktop/main.cjs`).
- O shell sobe o backend Express localmente e abre uma janela única,
  sem barra de endereço, carregando o frontend servido em `http://127.0.0.1:4800`.
- Toda a lógica de produto continua vivendo no frontend e backend descritos em `architecture.md`.

## Como usar (dev inicial)

1. Instalar dependências do shell (uma vez):
   - `npm install --prefix desktop`
2. Gerar o bundle do frontend:
   - `npm run build` (na raiz, gera `dist/`).
3. Subir o shell desktop:
   - `npm run dev --prefix desktop`

O Electron irá:

- iniciar o backend (`server/src/index.js`) com `SERVER_PORT=4800`;
- servir o bundle `dist/` via Express;
- abrir uma janela desktop carregando `http://127.0.0.1:4800`.

## Próximos passos sugeridos

- Adicionar scripts de empacotamento (installer) via `electron-builder` ou similar.
- Integrar o `launcher.bat` ou scripts equivalentes para oferecer um caminho único
  de instalação/execução para usuários finais.
