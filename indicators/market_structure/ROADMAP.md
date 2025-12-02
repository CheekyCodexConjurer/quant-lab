# Market Structure Indicator - ROADMAP

Roadmap de implementa��o do indicador de Estrutura de Mercado
(`server/indicators/market-structure.py` + pasta `server/indicators/market_structure/*`),
alinhado ao documento conceitual
`server/indicators/market_structure/trading-strategy/estrutura_de_mercado.md`.

## Fase 1 – Swings e BOS (conclu�da)

- [x] Detec��o de `swing-high` / `swing-low` com padr�o de 3 candles e plateaus  
  - `detect_swings` em `swings.py`.
- [x] Estrutura externa (`extract_external_structure`) alternando highs/lows e mantendo extremos.
- [x] Regra de **quebra v�lida** unificada para highs/lows (`is_valid_high_break` / `is_valid_low_break` em `breaks.py`).
- [x] Marca��o de **BOS** (`bos-bullish` / `bos-bearish`) via `build_levels_and_markers` em `structure.py`.

## Fase 2 – HSH / LSL e n�veis auxiliares (parcial)

- [x] Promo��o de swing-high / swing-low externos para **HSH** / **LSL** (`last_hsh` / `last_lsl`) com markers `hsh` / `lsl`.
- [x] Desenho de n�veis horizontais `hsh-level` / `lsl-level` entre swing e break correspondente.
- [ ] Ajustar visual dos n�veis internos para um estilo mais leve / opcional no frontend
      (hoje todos usam dashed gen�rico).

## Fase 3 – Protected Low / Protected High e MSS (parcial)

- [x] C�lculo de `last_bull_break` / `last_bear_break` em `structure.py` e promo��o para
      **Protected Low** / **Protected High**.
- [x] Desenho de n�veis `protected-low` / `protected-high` persistentes ao longo da estrutura
      (hist�rico completo mantido; sem limite interno).
- [x] Marca��o de **MSS** (`mss-bearish` / `mss-bullish`) na quebra v�lida do Protected Low/High.
- [x] Refinamento de Protected Low/High por **sweeps de n�vel protegido**
      (`_refine_protected_low_with_sweeps`, `_refine_protected_high_with_sweeps`).  
- [ ] Expor visualmente, no frontend, uma distin��o clara entre:
      - Protected atual (n�vel vigente) e
      - Protected hist�ricos (linhas “fantasmas” / desativadas).

## Fase 4 – MSC (Market Structure Continuation) (parcial)

- [x] Detectar explicitamente eventos de **MSC bullish/bearish** no backend, conforme se��o correspondente do
      arquivo conceitual (segmento de tend�ncia atual):
      - BOS estrutural a favor da tend�ncia **sem** quebra do n�vel protegido oposto.
- [x] Marcar MSC no overlay como:
      - markers `msc-bullish` / `msc-bearish` no candle da confirma��o; e
      - n�veis de perna (`msc-leg`) para visualiza��o das pernas que confirmam a continua��o.
- [x] Atualizar Protected Low/High a partir do swing de origem da perna de MSC no segmento vigente, conforme descrito em
      `estrutura_de_mercado.md` (Protected Low/High derivado dos swings de origem das pernas impulsivas).

## Fase 5 – Sweeps de estrutura (HSH/LSL) (conclu�da no backend)

- [x] Implementar detec��o expl�cita de **sweeps de HSH/LSL** (pavio atravessa HSH/LSL com corpo
      n�o confirmando BOS) em `structure.py` (`_refine_hsh_with_sweeps`, `_refine_lsl_with_sweeps`).
- [x] Atualizar HSH/LSL com base nesses sweeps, mantendo o mesmo Protected Low/High,
      conforme o arquivo conceitual (apenas o extremo estrutural passa a refletir o novo pavio).
- [x] Opcional: desenhar n�veis de sweep (`hsh-sweep`, `lsl-sweep`) com estilo ainda mais leve (n�veis auxiliares adicionais).

## Fase 6 – Overlay e integra��o com o frontend (parcial)

- [x] Expor `series`, `markers` e `levels` no formato da **Indicator Execution Engine**.
- [x] Mapear Protected High/Low para:
      - markers `protected-high` / `protected-low` (tri�ngulos vermelho/verde no chart);
      - n�veis horizontais `protected-high` / `protected-low` vis�veis em toda a janela.
- [x] Ajustar frontend (`ChartView` + `LightweightChart`) para **n�o limitar** historicamente
      n�veis e markers de Protected High/Low (apenas n�veis auxiliares s�o truncados).
- [ ] Expor op��es de UX no Strategy Lab para:
      - ligar/desligar visualiza��o de HSH/LSL, BOS, MSC, MSS separadamente;
      - controlar a densidade de n�veis internos por indicador/timeframe.

## Fase 7 – Hardening / Valida��o

- [ ] Bateria de casos sint�ticos (datasets pequenos) cobrindo:
      - sequ�ncias cl�ssicas de MSS, MSC e sweeps (HSH/LSL + Protected);
      - cen�rios de consolida��o longa, gaps e revers�es r�pidas.
- [ ] Documentar, a partir de screenshots, um “guia de leitura” do overlay no `docs/indicators/`,
      vinculando cada padr�o (MSS/MSC/sweep) a exemplos visuais reais.
