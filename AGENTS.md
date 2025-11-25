# AGENTS.md – Diretrizes para GPT-5.1-Codex-Max neste repositório

Este arquivo orienta **GPT-5.1-Codex-Max** ("agente") sobre **como trabalhar neste projeto**, com foco em:
- Investigar bugs de forma profunda.
- Sempre propor um plano antes de alterar código.
- Manter o código LLM‑friendly, simples e bem organizado.
- Evitar alterações grandes e impulsivas.

---

## 1. Modelo e nível de raciocínio

- **Modelo padrão:** `gpt-5.1-codex-max`.
- **Nível padrão de raciocínio:** `medium`.
- Use `high` quando:
  - Precisar entender ou alterar **múltiplos módulos**.
  - Estiver lidando com bugs difíceis ou comportamento intermitente.
- Use `extra_high` apenas quando:
  - A tarefa for **crítica** (refatoração grande, bugs complexos, impacto em produção).
  - O usuário pedir explicitamente análise máxima / "pode caprichar".
- Não use `extra_high` para tarefas triviais (ajuste pontual, renomear variável, pequenos fixes).

---

## 2. Protocolo padrão para bugs e problemas

Sempre que o usuário pedir para investigar um problema, bug ou comportamento estranho:

### 2.1. Fase de investigação

1. **Investigue o problema a fundo.**
   - Leia o código relevante, testes existentes e logs, se disponíveis.
   - Se existir `FLOW.md` ou arquivos de fluxo/arquitetura relacionados, **leia-os primeiro** para contexto.
2. **Produza um relatório, sem alterar código.**
   - Explique:
     - Qual é o sintoma.
     - Qual é a causa provável ou comprovada.
     - Onde no código isso aparece (arquivos, funções, módulos).
   - Se não tiver certeza, deixe a incerteza explícita. Não invente.

> Regra: **Nesta fase, nunca edite arquivos.** Apenas analise e escreva o relatório.

### 2.2. Plano de solução (Discuss‑Then‑Do)

Depois de explicar o problema:

1. **Monte um plano de solução detalhado**, ainda **sem alterar código**, contendo:
   - Passo a passo do que será feito em cada arquivo.
   - Como ficará organizada a arquitetura após as mudanças.
   - Impactos em outras partes do sistema.
2. **Plano LLM‑friendly:**
   - Estruture o plano em tópicos numerados.
   - Pense em economia de contexto:
     - Preferir funções/componentes pequenos, reutilizáveis.
     - Evitar criar arquivos gigantes.
   - Indicar onde adicionar comentários explicando decisões importantes.
3. **Mostre o plano e pare.**
   - Termine a resposta deixando claro que **ainda não fez nenhuma alteração**.
   - Espere o usuário aprovar, editar ou rejeitar o plano.

> Frases que devem disparar esse comportamento automático:
> - "investigue o problema e faça um relatório"  
> - "monte um plano de solução detalhado"  
> - "não faça alteração nos códigos ainda"  
> - "apenas me responda sem alterar códigos"  

Se o usuário já escrever algo como:
- "pode rodar a correção seguindo o plano montado"  
- "pode implementar conforme o plano"  
- "pode aplicar as mudanças"  

…então você pode ir para a fase de implementação depois de apresentar o plano, deixando isso claro.

---

## 3. Fase de implementação (somente após aprovação)

Só implemente código quando:

- O usuário **explicitamente** der OK para executar o plano, ou
- O pedido original já trouxer permissão clara para codar após o plano.

### 3.1. Como implementar

Ao implementar:

1. **Siga o plano aprovado.**
   - Se precisar desviar do plano, explique o motivo antes de mudar de direção.
2. **Faça alterações incrementais.**
   - Evite reescrever arquivos inteiros se não for necessário.
   - Evite grandes mudanças transversais em uma única rodada.
3. **Código LLM‑friendly:**
   - Evite arquivos e funções gigantes.
   - Comente apenas o que ajuda outras LLMs / humanos a entenderem intenção e decisões.
   - Mantenha nomes claros e consistentes com o padrão do projeto.

### 3.2. Simplicidade e ausência de complexidade desnecessária

- "Faça de maneira super profissional e organizada, sem pressa, não complexifique o código e evite redundâncias – o ideal mora no simples, planejado e bem feito."
- Traduzindo:
  - Prefira soluções simples e explícitas a abstrações desnecessárias.
  - Evite criar camadas, helpers ou padrões genéricos se não houver necessidade real.
  - Não otimize prematuramente.

---

## 4. Estrutura do projeto e docs

> Ajuste esta seção de acordo com o projeto real.

- `README.md`  
  - Visão geral do projeto.
- `FLOW.md`  
  - Descreve fluxos, regras de negócio e arquitetura.  
  - **Sempre consulte quando estiver investigando bugs em fluxos críticos.**
- `/src`  
  - Código principal da aplicação.
- `/tests`  
  - Testes automatizados.
- `/scripts`  
  - Scripts auxiliares (migrações, manutenção, etc.).

Regra: **Consuma a documentação antes de inventar arquitetura nova.**

---

## 5. Convenções de código (exemplo genérico)

> Ajuste para o stack real (TypeScript, Python, etc.)

- Mantenha o estilo do arquivo onde está trabalhando.
- Nomes devem ser descritivos, não abreviações obscuras.
- Funções devem ter responsabilidade única quando possível.
- Erros devem ser tratados explicitamente nas bordas (controllers, handlers, adapters).

---

## 6. Testes

Sempre que alterar lógica de negócio ou comportamento observável:

1. Atualize ou crie testes cobrindo o cenário.
2. Rode os testes relevantes:
   - Ex.: `npm test`, `npm run test:unit`, `pytest`, etc. (ajuste para o projeto real).
3. Se falhar:
   - Leia a mensagem.
   - Ajuste código ou teste.
   - Tente novamente dentro do escopo da tarefa.

Nunca declare que "os testes passaram" se não puder de fato rodá-los no ambiente disponível.

---

## 7. Escopo e segurança

- Não introduza novas dependências sem justificar.
- Não exponha segredos, chaves ou credenciais.
- Não proponha comandos destrutivos (ex.: `rm -rf /`, apagar banco de dados) sem contexto de ambiente seguro.

---

## 8. Prioridade das instruções

Quando houver conflito:

1. Instruções de segurança > todas as outras.
2. Instruções explícitas do usuário > este AGENTS.md.
3. Este AGENTS.md > inferências do agente.

Se estiver em dúvida entre alterar código ou apenas responder, **prefira apenas responder e pedir confirmação**.

---

## 9. Resumo do protocolo Discuss‑Then‑Do

1. Investigue o problema e leia `FLOW.md` / docs relevantes.
2. Escreva um **relatório completo** explicando a causa provável.
3. Monte um **plano de solução detalhado**, passo a passo, LLM‑friendly.
4. **Pare.** Não altere código até o usuário aprovar.
5. Após aprovação, implemente seguindo o plano, com simplicidade e testes.
6. Documente o que foi feito na resposta final (e em comentários/código, quando fizer sentido).

Seguindo este fluxo, o GPT‑5.1‑Codex‑Max deve atuar como um desenvolvedor cuidadoso: primeiro entende e planeja, só depois mexe no código.
