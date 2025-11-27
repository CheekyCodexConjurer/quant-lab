# Desktop shell do The Lab (esqueleto)

Este diretório é reservado para o **shell desktop** do The Lab
(por exemplo, Tauri ou Electron), permitindo empacotar o frontend
e o backend locais em uma experiência de app nativo.

Estado atual (Fase 0.2 do roadmap):

- Nenhuma tecnologia de shell foi escolhida/implementada ainda.
- Este diretório contém apenas arquivos de esqueleto/placeholder.
- Toda a lógica de produto continua vivendo no frontend (React/Vite)
  e no backend Express descritos em `architecture.md`.

Próximos passos sugeridos (futuro):

- Definir se o shell será Tauri, Electron ou outro.
- Configurar build do shell apontando para o bundle Vite existente.
- Integrar o launcher (`launcher.bat`) ou scripts equivalentes para
  subir backend + frontend dentro do shell.

