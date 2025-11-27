# AGENTS.md – Diretrizes para GPT-5.1-Codex-Max neste repositório

Estas regras guiam o agente neste projeto **quant-lab**.

Objetivo:  
Trabalhar de forma **analítica, faseada e LLM-friendly**, sempre:

- Lendo a arquitetura antes de mexer.
- Montando plano antes de codar (exceto quando o usuário pedir explicitamente “já aplica”).
- Mantendo `architecture.md`, `README.md` e o roadmap atualizados quando a arquitetura/comportamento mudarem.
- Evitando arquivos gigantes e código caótico difícil de navegar por LLMs.

---

## 1. Modelo, estilo e prioridades

- Modelo padrão: `gpt-5.1-codex-max`.
- Nível: `extra-high`.
- Estilo de raciocínio:
  - Explícito, estruturado, com seções e passos numerados.
  - Sempre separar:
    - **Entendimento / investigação**
    - **Plano**
    - **Implementação**

### 1.1. Ordem de precedência

Quando regras entrarem em conflito, siga esta ordem:

1. Regras de segurança da plataforma.
2. Instruções explícitas do usuário na conversa atual.
3. Este `AGENTS.md`.
4. Inferências/contexto anterior.

Em caso de dúvida real entre duas ações potencialmente destrutivas, **pergunte** antes de editar código.

---

## 2. Leitura obrigatória antes de mexer

Antes de qualquer mudança significativa (bug, feature, refactor, arquitetura):

1. Leia `architecture.md` para entender:
   - estrutura de pastas
   - fluxos principais (market data, Lean backtest, Dukascopy, etc.)
   - contratos entre frontend / backend.
2. Leia `README.md` para:
   - visão de propósito do projeto
   - como subir o ambiente.
3. Se a tarefa apontar para o roadmap:
   - Leia o arquivo de roadmap (ex.: `ROADMAP-Extended.md` ou `ROADMAP.md`, conforme o repositório).
4. Se a tarefa citar arquivos específicos, leia esses arquivos **antes** de sugerir plano.

Não pule essa etapa “pra ganhar tempo”. Você é lento mas teimoso por design.

---

## 3. Modos de tarefa (mapeados aos prompts do usuário)

O usuário usa alguns padrões de prompt. Você **deve detectar o modo** da tarefa a partir de frases-chave e se comportar de acordo.

### 3.1. Modo A – Plano de implementação (sem código)

Frases típicas:

- “Monte um plano de implementação detalhado…”
- “Monte um plano de implementação faseado…”
- “Não altere nenhum código ainda, apenas descreva o plano.”

Comportamento:

1. **Não mexer em nenhum arquivo.**
2. Entregar:
   - Contexto resumido (1–2 parágrafos).
   - Passos numerados por **arquivo** / **módulo**.
   - Explicar como a arquitetura ficará (ou será ajustada).
   - Destacar pontos LLM-friendly:
     - dividir arquivos muito grandes
     - onde criar novos módulos
     - onde colocar comentários.
3. Citar explicitamente os arquivos que pretende tocar:
   - `src/views/...`
   - `src/hooks/...`
   - `server/src/services/...`
   - etc.
4. Parar após o plano, **sem código**.

### 3.2. Modo B – Plano de solução FASEADO (sem código)

Frases típicas:

- “Plano de solução FASEADO e detalhado para este problema…”
- “Plano de solução para o problema específico, sem mexer no código…”

Comportamento:

1. Entregar:
   - **Causa provável** (baseada na leitura do código).
   - Plano em **fases**:
     - Fase 1: inspeção/refactor estrutural.
     - Fase 2: ajuste de lógica / contratos.
     - Fase 3: testes, limpeza, docs.
   - Para cada fase:
     - arquivos a tocar
     - mudanças principais
     - riscos.
2. Não escrever código, apenas plano.
3. Destacar como o resultado ficará LLM-friendly:
   - redução de acoplamento
   - quebra de arquivos grandes
   - comentários objetivos.

### 3.3. Modo C – Investigar, planejar e já aplicar a correção

Frases típicas:

- “Investigar, planejar e já aplicar a correção…”
- Ou qualquer variação que **explicitamente** diga para implementar após o plano.

Comportamento:

1. **Primeiro: Investigação**
   - Descrever brevemente:
     - comportamento esperado vs. atual
     - arquivos/funções relevantes.
2. **Segundo: Plano Faseado**
   - Seguir o padrão do Modo B (fases, arquivos, riscos).
3. **Terceiro: Implementação**
   - Implementar seguindo o plano.
   - Manter o código:
     - dividido em arquivos razoáveis
     - com comentários objetivos
     - evitando funções enormes.
4. Ao final:
   - Listar **todos os arquivos modificados/criados**.
   - Resumir em 3–7 bullets o que foi feito.
   - Indicar se `architecture.md`, `README.md` ou o roadmap foram atualizados.

### 3.4. Modo D – Relatório técnico sem implementar

Frases típicas:

- “Investigue o problema no código e produza um RELATÓRIO técnico detalhado…”
- “Sugira uma solução inteligente (sem implementar).”

Comportamento:

1. Não alterar código nem arquivos.
2. Entregar relatório com seções:

   - Resumo do problema
   - Comportamento esperado vs. atual
   - Arquivos / funções relevantes
   - Análise de causa raiz (ou hipóteses)
   - Impactos, riscos, casos de borda
   - Opções de solução recomendadas

3. Evitar colar blocos grandes de código; citar apenas trechos mínimos necessários.

### 3.5. Modo E – Refactor / Arquivos muito grandes / LLM-friendly

Frases típicas:

- “Averigue arquivos no repositório que estão muito grandes.”
- “Proponha uma reestruturação da arquitetura desses arquivos…”
- “Com objetivo de torná-los LLM-friendly, economizar contexto…”

Comportamento:

1. Levantar arquivos problemáticos:
   - listar arquivos por tamanho/função/responsabilidade.
2. Propor uma **nova arquitetura**:
   - novos módulos/pastas
   - separação de responsabilidades
   - contratos entre partes.
3. Planejar refactor **faseado**:
   - Fase 1: extrair tipos/funções utilitárias.
   - Fase 2: fatiar componentes/views gigantes.
   - Fase 3: ajustar imports, testes, docs.
4. Destacar:
   - impacto na navegação por LLMs
   - redução de contexto por arquivo.
5. Só implementar refactor se o usuário autorizar explicitamente ou pedir Modo C.

---

## 4. Fluxo padrão Discuss-Then-Do

Independente do modo (exceto quando o usuário mandar só “codar isso”), siga este fluxo:

1. **Entender a tarefa**
   - Resumir o que o usuário quer em 2–3 frases.
   - Identificar o **modo** (A/B/C/D/E ou misto).
2. **Investigar**
   - Ler `architecture.md`, `README.md` e, se citado, o roadmap.
   - Ler os arquivos diretamente envolvidos.
3. **Relatar**
   - Descrever o estado atual relevante para a tarefa.
4. **Planejar**
   - Escrever plano estruturado, faseado quando fizer sentido.
5. **Esperar aprovação** (quando o usuário pediu explícito “sem mexer no código”).
6. **Implementar** (quando:
   - o usuário pedir diretamente para implementar, ou
   - usar o Modo C “investigar, planejar e já aplicar”).

---

## 5. LLM-friendly: regras de código e arquitetura

Sempre que escrever ou alterar código:

1. **Tamanho de arquivo**
   - Evitar arquivos monolíticos:
     - Views, hooks, services muito grandes devem ser alvo de fatiamento.
   - Se um arquivo começar a virar “god file”, sugerir refactor (Modo E).

2. **Comentários**
   - Comentários **curtos e objetivos**:
     - explicar **por que** algo existe, não repetir o óbvio.
   - Evitar comentários narrativos longos.

3. **Modularização**
   - Preferir pequenos módulos/funções com nomes claros.
   - Separar:
     - view (UI)
     - hook de lógica
     - serviços de API
     - utils puros.

4. **Dependências**
   - Evitar criar dependências circulares.
   - Atualizar `architecture.md` quando criar novas pastas/módulos de infraestrutura.

5. **Respostas**
   - Não colar arquivos enormes na resposta.
   - Quando precisar mostrar código longo:
     - focar apenas nas partes alteradas
     - indicar o resto por comentário (“… código inalterado omitido …”).

---

## 6. Documentação e sincronização (architecture, README, roadmap)

Sempre que uma mudança:

- introduzir um módulo/pasta novo relevante,
- alterar fluxos principais (ex.: como Lean é chamado, como dados são importados),
- ou mudar comportamento visível para o usuário,

você deve:

1. Avaliar se `architecture.md` precisa ser atualizado.
2. Atualizar `README.md` se:
   - comandos de execução mudarem;
   - dependências mudarem;
   - um novo fluxo manual for exigido.
3. Atualizar o roadmap (ex.: `ROADMAP-Extended.md` ou `ROADMAP.md`) se:
   - uma tarefa de fase for concluída;
   - escopo de uma fase for ajustado.

Na resposta para o usuário, sempre citar explicitamente:

- “Atualizado: architecture.md”
- “Atualizado: README.md”
- “Atualizado: ROADMAP-Extended.md (seção X)”

quando isso ocorrer.

---

## 7. Fatiamento de tarefas grandes

Se a tarefa:

- mexer em muitos arquivos,
- envolver frontend + backend + desktop ao mesmo tempo, ou
- representar um passo grande do roadmap,

você **deve propor** um fatiamento, por exemplo:

- Fase 1: ajustes internos / refactor preparatório.
- Fase 2: mudança de comportamento / API / UI.
- Fase 3: limpeza, testes, docs e arquitetura.

Explique o que será entregue em cada fase.  
Se o usuário só aprovar a Fase 1, implemente somente ela.

---

## 8. Convenções de resposta

1. Formato:
   - usar títulos (`##`, `###`) e listas numeradas.
   - separar claramente:
     - Contexto
     - Investigação
     - Plano
     - Implementação (se houver)
     - Arquivos alterados
     - Próximos passos.

2. Linguagem:
   - Português brasileiro, técnico e direto.
   - Evitar floreio desnecessário.

3. Código:
   - sempre em blocos ` ```ts `, ` ```js `, ` ```py ` etc.
   - indicar path do arquivo antes do bloco de código quando alterar múltiplos arquivos.

---

## 9. Resumo ultra-curto do protocolo

Quando estiver em dúvida, siga isso:

1. Leia `architecture.md`, `README.md` e o(s) arquivo(s) citados.
2. Descubra qual **modo** (A/B/C/D/E) o usuário quer.
3. Investigue e relate o estado atual.
4. Monte um plano detalhado, faseado quando fizer sentido, LLM-friendly.
5. Pare aí se o usuário pediu explicitamente “sem alterar código”.
6. Só implemente depois de:
   - ter um plano claro
   - e o pedido do usuário permitir (ex.: Modo C).
7. Sempre que mexer em arquitetura/comportamento, sincronize docs e diga o que foi atualizado.

Se você respeitar este arquivo + `architecture.md`, o projeto continua coerente, e as LLMs futuras não te xingam quando abrirem esses arquivos.
