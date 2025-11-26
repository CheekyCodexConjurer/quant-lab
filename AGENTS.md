# AGENTS.md - Diretrizes para GPT-5.1-Codex-Max neste repositorio

Estas regras guiam o agente neste projeto **quant-lab**. Siga o fluxo discuss-then-do: investigar, relatar, planejar, esperar aprovacao e so entao implementar.

## 1. Modelo e raciocinio
- Modelo padrao: `gpt-5.1-codex-max`.
- Nivel padrao: `extra-high`.


## 2. Protocolo de bugs/problemas
1) Investigacao: leia codigo, testes e logs. Consulte docs antes (README, front-end-architecture.md, back-end-architecture.md).  
2) Relatorio (sem editar arquivos): descreva sintoma, causa provavel/confirmada, localizacao (arquivos/trechos). Declare incertezas.  
3) Plano: apresente passos numerados por arquivo/trecho e impactos. Pare e aguarde OK.  
4) Implementacao: so apos autorizacao (ou se a solicitacao ja liberar explicitamente codar).

Frases como "investigue", "monte um plano" ou "nao altere codigo ainda" significam parar apos o plano.

## 3. Implementacao
- Siga o plano aprovado; se precisar mudar, explique antes.
- Mudancas incrementais; evite reescrever arquivos sem necessidade.
- Codigo LLM-friendly: nomes claros, funcoes pequenas, comentar apenas decisoes nao obvias.
- Prefira simplicidade; evite abstrair cedo demais.

## 4. Estrutura do projeto e docs
- `README.md`: visao geral.
- `front-end-architecture.md`: mapa do frontend (estado, hooks, views, componentes, servicos, utils, fluxos).
- `back-end-architecture.md`: mapa do backend (rotas, servicos, persistencia, testes, fluxos de importacao/CRUD).

Consuma a documentacao antes de inventar arquitetura nova.

## 5. Convenções
- Mantenha estilo existente (TS/React no frontend; JS CommonJS no backend).
- Nomes descritivos; responsabilidade unica quando possivel.
- Trate erros nas bordas (rotas/servicos) de forma clara.
- Use ASCII como padrao ao editar/criar arquivos.

## 6. Testes
- Ao alterar logica: crie/atualize testes e rode os relevantes.
- Backend: `npm run test:backend` (scripts em `server/test`).
- Nunca afirme que testes passaram sem executa-los neste ambiente.

## 7. Escopo e seguranca
- Evite novas dependencias sem justificativa.
- Nao exponha chaves/segredos.
- Evite comandos destrutivos; nunca reverta mudancas do usuario.

## 8. Prioridade de instrucoes
1) Seguranca.  
2) Instrucoes explicitas do usuario.  
3) Este AGENTS.md.  
4) Inferencias.  
Em duvida, prefira responder e pedir confirmacao antes de editar.

## 9. Resumo Discuss-Then-Do
1. Investigue o problema e leia `README.md` / docs relevantes.
2. Escreva um **relatório completo** explicando a causa provável.
3. Monte um **plano de solução detalhado**, passo a passo, LLM-friendly, visando a economia de contexto, comentários objetivos e evitando arquivos muito grandes.
4. Fazendo o design da arquitetura do código e organizando a nivel PHD o códigos e pastas.
5. **Pare.** Não altere código até o usuário aprovar.
6. Após aprovação, implemente seguindo o plano, com simplicidade e testes.
7. Documente o que foi feito na resposta final (e em comentários/código, quando fizer sentido).
