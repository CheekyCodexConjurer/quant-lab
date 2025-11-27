# The Lab – Roadmap de Produto (Versão orientada a receita)

> Atualizado em **27/11/2025**

---

## Visão Geral

**Objetivo:**  
Transformar o The Lab em um laboratório local de backtesting quantitativo, lucrativo e sustentável, com:

- Integração nativa com Lean / Dukascopy.
- Ambiente único para código, dados, gráficos e análises.
- Ferramentas avançadas de breakdown técnico, calendário econômico e otimização de parâmetros.
- Infraestrutura de contas, cobrança e segurança adequada **implementada de forma incremental**, priorizando:
  - Entrar receita cedo.
  - Reduzir custos fixos de infraestrutura.
  - Reinvestir o lucro em features mais caras (APIs, segurança avançada, marketing).

---

## Princípios de negócio & custos

1. **Compute local primeiro**  
   - Backtests rodam na máquina do usuário (Lean local).
   - Evita custo de servidor rodando simulação pra todo mundo.

2. **Monetização cedo, backend depois**  
   - Primeiro: vender uma versão local/desktop com licença (Founding User / Early Access).  
   - Depois: construir backend próprio de login, planos mensais e segurança avançada.

3. **Infra cara vem só depois de receita**  
   - APIs de Economic Data, telemetria avançada, campanhas de marketing pagas e hardening pesado de segurança só entram quando houver receita recorrente.

---

## Linha do Tempo (orientada a receita)

| Fase | Nome                                                       | Período alvo                 | Foco principal                              |
|------|------------------------------------------------------------|------------------------------|--------------------------------------------|
| 0    | Protótipo & Empacotamento Local                            | **11/2025 – 01/2026**        | Ter um app usável por você e poucos testers|
| 1    | Paid Alpha · Desktop Local, Licença Única                  | **02/2026 – 03/2026**        | Primeira receita com versão local          |
| 2    | Paid Beta · Contas Online, Breakdown & Experiments         | **04/2026 – 06/2026**        | Assinatura Pro básica + análise avançada   |
| 3    | v1.0 · Economic Data, News, Grid Search & Segurança Forte  | **07/2026 – 09/2026**        | Produto completo com features “caras”      |

Marcos de entrega:

- **15/02/2026** – Lançamento do **Paid Alpha** (licença única).  
- **01/06/2026** – Lançamento do **Paid Beta** com conta online e plano Pro.  
- **01/09/2026** – Lançamento da **v1.0** com Economic Data, News e Grid Search.

---

## Fase 0 · Protótipo & Empacotamento Local  
**Período alvo: 27/11/2025 – 31/01/2026**  
**Meta:** Ter um app desktop funcional para uso interno e poucos testers, sem preocupação ainda com billing/segurança avançada.

### Escopo funcional

1. **Core de backtest local**
   - Integração com Lean CLI:
     - Execução de backtests locais.
     - Logs e status básicos (Idle / Running / Finished).
   - Suporte mínimo a:
     - 1 instrumento (ex.: **CL1!**).
     - 1–2 estratégias e 1–2 indicadores.

2. **Layout base do app**
   - Sidebar com árvore de arquivos (`workspace/strategies`, `workspace/indicators`).
   - Editor de código.
   - Painel de logs na base.
   - Tela de **Overview** com:
     - KPIs básicos (Net Profit, Win Rate, Total Trades, Max DD).
     - Equity curve.
     - Trade log simples.

3. **Empacotamento desktop**
   - App desktop (ex.: Tauri/Electron) com:
     - Seleção de workspace Lean local.
     - Atualização básica (mesmo que manual nessa fase).
   - Sem login obrigatório ainda:
     - Fase 0 é para você e poucos testers controlados.

### Receita & custos nesta fase

- **Receita:** nenhuma (fase de investimento de tempo).  
- **Custos:**
  - Zero ou muito baixos de infraestrutura (tudo local).
  - Só seu tempo + eventualmente uma conta básica de repositório/código.

---

## Fase 1 · Paid Alpha · Desktop Local, Licença Única  
**Período alvo: 01/02/2026 – 31/03/2026**  
**Lançamento alvo do Paid Alpha: 15/02/2026**  

**Meta:** Lançar uma versão vendável, totalmente local, com licença única (lifetime ou long-term), sem precisar ainda de backend próprio robusto.

### Estratégia de monetização

- Modelo de **licença única Early Access / Founding User**:
  - Venda via plataforma terceira (ex.: Gumroad / similar), que:
    - Processa pagamento.
    - Gera chave de licença / arquivo de licença.
  - Você não precisa manter billing complexo nem sistema de cobrança recorrente ainda.
- Proposta:
  - “Alpha de The Lab – Desktop Lean Lab para CL1! / poucos instrumentos”.
  - Garantir upgrade gratuito até v1.0 para quem entrar cedo.

### Escopo funcional (o que precisa para ser vendável)

1. **Lab Local Básico (refinado)**
   - Mesmos blocos da Fase 0, mas mais estáveis:
     - Execução de backtests confiável.
     - Overview funcional e apresentável.
   - Suporte a:
     - Pelo menos 1–3 instrumentos (ex.: CL1!, ES1!, BTC1!).
     - Configurações básicas de **Data Settings** para esses instrumentos:
       - Timezone.
       - Gap quantization.
       - Price basis.
       - Tick discretization.

2. **Indicators “de gente grande”**
   - Suporte a:
     - Funções auxiliares.
     - Classes.
     - Imports entre arquivos dentro de `indicators/`.
   - Documentação mínima em **API Docs**:
     - Estrutura do projeto.
     - Exemplo de criação de indicador custom.

3. **Overview com cortes simples**
   - KPIs principais bem apresentados.
   - Equity curve com interação básica (tooltip).
   - Trade log filtrável ou pelo menos ordenável.

4. **Licença local simples**
   - O app aceita:
     - Uma chave de licença (serial) ou arquivo de licença.
   - Validação local:
     - Sem necessidade de servidor online.
   - Mínimas proteções:
     - Chave verificada por algoritmo simples (ex.: assinatura/verificação).
     - Nada de hardening pesadíssimo ainda, apenas “não escancarado”.

### Receita & custos nesta fase

- **Receita esperada:**
  - Venda de **licenças Alpha** (ticket possivelmente único, ex.: “Early Access License”).
  - Foco em 10–50 usuários iniciais para validar produto e levantar primeira grana.
- **Custos:**
  - Ainda sem backend próprio de auth/billing.
  - Sem API paga de Economic Data.
  - Uso de plataforma de venda que cobra % da transação (sem custo fixo).

---

## Fase 2 · Paid Beta · Contas Online, Breakdown & Experiments  
**Período alvo: 01/04/2026 – 30/06/2026**  
**Lançamento alvo do Paid Beta: 01/06/2026**

**Meta:** Com um mínimo de receita da Fase 1, investir em backend simples de contas, ativar plano Pro recorrente e entregar análise mais profunda.

### Estratégia de monetização

- Manter licenças Early Access já vendidas:
  - Usuários Alpha continuam com acesso (podem ser “v1.0 included”).
- Introduzir **plano Pro mensal/anual**:
  - Acesso a:
    - Multi-asset mais amplo.
    - Breakdown técnico avançado (tempo, sessão, market).
    - Experiments v1.
- Billing:
  - Integração com gateway de pagamento (ex.: Stripe/Similar):
    - Criar cliente.
    - Assinatura Pro.
    - Webhooks para status da assinatura.

### Escopo funcional

1. **Contas & Auth online (nível básico)**
   - Backend com:
     - Registro de usuário (email + senha).
     - Login, logout, reset de senha.
   - App desktop passa a ter:
     - Tela de login.
     - Associação da licença local à conta online (para Early Access).

2. **Overview · Time Breakdown**
   - Seção “Time Analysis”:
     - Tabelas por dia da semana, mês, hora do dia.
     - Métricas: Samples, Win Rate, Return (Units), Profit Factor.

3. **Overview · Market / Session Breakdown**
   - Tabelas por:
     - Instrumento/market.
     - Session (Londres / NY / etc, conforme configuração).
   - Mesmo conjunto de métricas.

4. **Experiments v1**
   - Cada backtest gera um **Experiment** com:
     - Parâmetros.
     - Dataset/período.
     - KPIs.
   - Comparação lado a lado entre dois experiments:
     - KPIs + Equity curves.

5. **Infra preliminar para Economic Data**
   - Modelo de dados de eventos econômicos no backend.
   - Integração experimental com 1 provider (ainda sem UI completa).

### Segurança & licenciamento nesta fase

- Verificação de plano e licença ao logar.
- Sessões com tokens seguros (HTTPS, JWT).
- Primeira camada de:
  - Rate limits básicos.
  - Logs de login falho / comportamento suspeito.

### Receita & custos nesta fase

- **Receita:**
  - Assinaturas Pro.
  - Continuidade das vendas (agora com narrativa mais forte de produto).
- **Custos:**
  - Backend simples (pode ser em infra barata / serverless).
  - Gateway de pagamento (taxa por transação).
  - Ainda sem grandes custos com APIs de Economic Data (uso moderado/teste).

---

## Fase 3 · v1.0 · Economic Data, News, Grid Search & Segurança Forte  
**Período alvo: 01/07/2026 – 30/09/2026**  
**Lançamento alvo da v1.0: 01/09/2026**

**Meta:** Diferenciar o produto com calendário econômico integrado, análise por notícias, grid search (permuta de parâmetros) e endurecimento sério de segurança/licenciamento.

### Estratégia de monetização

- Plano **Pro** passa a incluir:
  - Economic Data integrado.
  - News breakdown.
  - Parameter Sweep / Grid Search.
- Avaliar:
  - Plano mais caro (“Pro+”) se Economic Data tiver custo relevante.
  - Limites por plano (número de instrumentos, quantidade de runs em grid, etc).

### Escopo funcional

1. **Economic Data · Tela dedicada**
   - Sidebar: **Economic Data**.
   - Seções:
     - **Source Settings**:
       - Provider.
       - API key.
       - Range de datas/instrumentos.
     - **Filters**:
       - Países (multi-select).
       - Tipo de evento.
       - Importance.
   - Lista de eventos sincronizados.

2. **Overview · News Breakdown**
   - Seção “News Analysis”:
     - Tabela por tipo de evento (FOMC, CPI, NFP, etc).
     - Métricas: Cases, Win Rate, Return, Profit Factor.
     - Filtro de janelas em torno dos eventos (X antes / Y depois).

3. **Parameter Sweep (Grid Search)**
   - UI para definir permutas de parâmetros:
     - Seleção de parâmetros da estratégia.
     - Ranges/listas de valores (ex.: EMA 200/300/500).
   - Execução em fila:
     - Múltiplos backtests sequenciais.
   - Resultados:
     - Tabela com combinações + KPIs.
     - Heatmap 2D para 2 parâmetros.
   - Integração com Experiments:
     - Cada run registrado como experiment.

4. **Dashboard avançado**
   - Blocos:
     - Technical Analysis geral (tempo, sessão, market).
     - News Technical Analysis.
   - Visual:
     - Heatmaps suaves.
     - KPIs em monospace, alinhamento à direita, layout limpo.

### Segurança & Anti-crack nesta fase

1. **Hardening de licenciamento**
   - Criptografia mais forte de:
     - Artefatos de licença local.
     - Claims de plano/expiração.
   - Assinatura/verificação de tokens de licença (chaves assimétricas).
   - Validação periódica online (com tolerância a uso offline controlado).

2. **Proteção contra cracks**
   - Ofuscação de trechos críticos ligados a:
     - Verificação de licença.
     - Check de plano Pro.
   - Checagens redundantes em pontos diferentes do app.

3. **Monitoramento & resposta**
   - Backend com:
     - Logs de uso suspeito.
     - Possibilidade de revogar licenças e bloquear contas.
   - Alertas internos em caso de:
     - Uso simultâneo excessivo por conta.
     - Volume absurdo de requests de verificação.

### Receita & custos nesta fase

- **Receita:**
  - Base de assinaturas Pro ativa (idealmente já paga os custos fixos).
  - Upsell através de features avançadas (Economic Data, Grid Search).
- **Custos:**
  - Assinatura da(s) API(s) de Economic Data.
  - Infra de backend mais estável.
  - Possível investimento em marketing / conteúdo educacional.

---

## Resumo da estratégia de dinheiro primeiro

- **Fase 0–1:**  
  - Foco total em **app local vendável** com custo quase zero de infraestrutura.  
  - Monetização via **licença única Early Access** usando plataforma de terceiros (sem backend próprio ainda).

- **Fase 2:**  
  - Com receita inicial, construir **backend de contas + plano Pro recorrente**.  
  - Entregar valor técnico concreto (Breakdown + Experiments) para justificar assinatura.

- **Fase 3:**  
  - Só depois que houver base paga e produto estável, investir em:
    - Economic Data integrado.
    - Grid Search.
    - Hardening de segurança/licenciamento.
    - Marketing mais agressivo.

