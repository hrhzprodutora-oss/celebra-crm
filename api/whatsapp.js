// =========================================================================
// CANAL FINANCEIRO OFICIAL - CELEBRA EVENTOS (WEBHOOK WHATSAPP V4 - AUDITOR)
// Leitura Multimodal (PDF + Imagem) • Vínculo Seguro • Zero Chutes
// =========================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ddehyuertafctuhnfgpn.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_GPBZkeBWljCdCnzf-1MH7w_yuR2JWPw";
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const EVOLUTION_URL = process.env.EVOLUTION_URL || "https://evolution-api-production-25290f3d.up.railway.app";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "b49b711585c3bb5525906424fbf7871d712810afdd95719a228a6b3f8b830594";
const INSTANCE_NAME = process.env.INSTANCE_NAME || "celebra-eventos";

const GEMINI_MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-4-hydrogen"]
  : ["gemini-3.5-flash-lite", "gemini-4-hydrogen"];
const DATA_FORMATURA_ISO = "2026-12-03";
const SAUDACAO_COOLDOWN_HORAS = 12;

const STOPWORDS = new Set([
  "de", "da", "do", "dos", "das", "e", "a", "o", "as", "os", "em", "no", "na", "nos", "nas",
  "para", "por", "com", "que", "seu", "sua", "pix", "comprovante", "parcela", "parcelas",
  "formatura", "pagamento", "ultima", "penultima", "valor", "segue", "bom", "dia", "boa",
  "tarde", "noite", "ola", "oi", "oie", "aprovado", "colegio", "turma", "macae", "rj",
  "convite", "convites", "extra", "extras", "aluna", "aluno", "formando", "formanda",
  "quitacao", "quitar", "restante", "referente", "pago", "paga", "boleto", "pdf", "foto",
  "jr", "junior", "filho", "neto", "sr", "sra", "dr", "dra", "terceirao", "festa", "baile"
]);

const NOMES_PROPRIOS_COMUNS = new Set([
  "ana", "maria", "joao", "pedro", "paulo", "carlos", "luiz", "luis", "luiza", "luisa",
  "clara", "beatriz", "fernanda", "eduardo", "eduarda", "henrique", "sophia", "sofia",
  "cristina", "cristine", "helena", "isabela", "isabella", "carolina", "vinicius",
  "batista", "alberto", "antonio", "jose", "marcos", "marco", "gabriel", "gabriela",
  "rafael", "rafaella", "daniel", "daniela", "lucas", "lukas", "matheus", "mateus",
  "arthur", "andre", "marcelo", "marcello", "guilherme", "roberto", "ricardo", "rodrigo",
  "fernando", "bruno", "davi", "heitor", "lara", "larissa", "laura", "julia", "manuela",
  "manuella", "mariana", "vitoria", "nathalia", "natalia", "cecilia", "patricia", "simone",
  "alessandra", "renata", "camile", "mayra", "monica", "flavia", "raquel", "rachel", "marta",
  "marcia", "juliana", "lucia", "samira", "gleice", "leticia", "suellen", "karla", "dayanna"
]);

const SOBRENOMES_MUITO_COMUNS = new Set([
  "silva", "santos", "oliveira", "souza", "sousa", "rodrigues", "ferreira", "alves",
  "pereira", "lima", "gomes", "costa", "ribeiro", "martins", "carvalho", "almeida",
  "lopes", "soares", "fernandes", "vieira", "barbosa", "rocha", "dias", "nascimento",
  "andrade", "moreira", "nunes", "marques", "machado", "mendes", "freitas", "cardoso",
  "ramos", "goncalves", "santana", "teixeira", "araujo", "azevedo", "castro", "reis",
  "paula", "campos", "moura", "bastos", "neves", "cruz", "monteiro", "pinto", "correia"
]);

const SCHEMA_AUDITORIA_COMPROVANTE = {
  type: "object",
  properties: {
    tipo_documento: {
      type: "string",
      enum: [
        "comprovante_pix",
        "comprovante_boleto",
        "comprovante_transferencia",
        "comprovante_cartao",
        "boleto_em_aberto",
        "agendamento",
        "nao_comprovante"
      ],
      description: "Classificação exata do documento analisado."
    },
    valor: {
      type: "number",
      nullable: true,
      description: "Valor monetário exato efetivamente pago em reais (ex: 430.00, 1720.00). Null se não for comprovante ou ilegível."
    },
    data_pagamento: {
      type: "string",
      nullable: true,
      description: "Data do pagamento no formato YYYY-MM-DD."
    },
    hora_pagamento: {
      type: "string",
      nullable: true,
      description: "Hora do pagamento no formato HH:MM."
    },
    nome_pagador: {
      type: "string",
      nullable: true,
      description: "Nome completo de QUEM PAGOU (Origem / De / Pagador). NUNCA colocar Celebra Eventos ou Luana Marques Vianna aqui."
    },
    cpf_pagador: {
      type: "string",
      nullable: true,
      description: "CPF ou CNPJ do pagador exatamente como aparece no documento (mesmo mascarado, ex: ***.066.527-**)."
    },
    banco_pagador: {
      type: "string",
      nullable: true,
      description: "Instituição financeira de origem/pagador (ex: Itaú, Bradesco, Nubank, Santander, Caixa, Inter, Banco do Brasil, Next, C6, Sicredi)."
    },
    nome_favorecido: {
      type: "string",
      nullable: true,
      description: "Nome do recebedor/favorecido/destino (ex: Celebra Eventos, Luana Marques Vianna)."
    },
    chave_pix_destino: {
      type: "string",
      nullable: true,
      description: "Chave Pix ou CNPJ/CPF do favorecido, se constar no comprovante."
    },
    eh_para_celebra: {
      type: "boolean",
      nullable: true,
      description: "true se o favorecido for Celebra Eventos / Luana Marques Vianna / CNPJ 50.130.618/0001-44 / telefone 22998975785 / celebraeventosofc@gmail.com; false se claramente for outro destinatário sem relação; null se o documento não mostrar o favorecido."
    },
    id_transacao: {
      type: "string",
      nullable: true,
      description: "ID E2E do Pix (ex: E60701190...), código de autenticação ou número de controle da transação."
    },
    descricao_ou_mensagem: {
      type: "string",
      nullable: true,
      description: "Texto do campo Descrição, Mensagem, Observação ou Identificação dentro do comprovante, se houver."
    },
    nome_aluno_mencionado: {
      type: "string",
      nullable: true,
      description: "Nome do aluno/formando mencionado na descrição do comprovante, nome do arquivo ou legenda, se houver."
    },
    eh_convite_extra: {
      type: "boolean",
      description: "true se o comprovante, descrição ou mensagem indicar pagamento de convites extras ou mesa extra."
    },
    qtd_convites_extras: {
      type: "integer",
      nullable: true,
      description: "Quantidade de convites extras mencionados, se aplicável."
    },
    sugestao_formando_id: {
      type: "integer",
      nullable: true,
      description: "ID numérico do formando da lista oficial apenas se houver evidência clara. Null se houver dúvida ou ambiguidade."
    },
    sugestao_confianca: {
      type: "string",
      enum: ["alta", "media", "baixa", "nenhuma"],
      description: "Nível de certeza sobre o vínculo com sugestao_formando_id."
    },
    sugestao_justificativa: {
      type: "string",
      nullable: true,
      description: "Explicação objetiva e curta (1 frase) de como identificou os dados e o vínculo, ou por que há dúvida."
    },
    confianca_leitura: {
      type: "string",
      enum: ["alta", "media", "baixa"],
      description: "Qualidade/clareza da leitura visual do documento."
    },
    observacoes_auditoria: {
      type: "string",
      nullable: true,
      description: "Alertas importantes: documento cortado, agendamento, boleto não pago, divergência de favorecido, etc."
    }
  },
  required: [
    "tipo_documento",
    "eh_convite_extra",
    "sugestao_confianca",
    "confianca_leitura"
  ]
};

// =========================================================================
// HANDLER PRINCIPAL (VERCEL SERVERLESS)
// =========================================================================

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
    const action = url.searchParams.get("action");

    if (action === "health_gemini") {
      if (!GEMINI_API_KEY) {
        return res.status(200).json({
          gemini_configurada: false,
          gemini_ok: false,
          erro: "Variável de ambiente GEMINI_API_KEY não configurada na Vercel."
        });
      }

      const t0 = Date.now();
      const testes = [];
      for (const model of GEMINI_MODELS) {
        try {
          const r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY,
              "Api-Revision": "2026-05-20"
            },
            signal: AbortSignal.timeout(12000),
            body: JSON.stringify({ model, store: false, input: "Responda apenas OK" })
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok) {
            return res.status(200).json({
              gemini_configurada: true,
              gemini_ok: true,
              modelo_ativo: model,
              endpoint: "interactions",
              status_http: r.status,
              latencia_ms: Date.now() - t0
            });
          }
          testes.push({ model, endpoint: "interactions", status: r.status, erro: j?.error?.message || j?.[0]?.error?.message || "Erro HTTP" });
        } catch (e) {
          testes.push({ model, endpoint: "interactions", status: 0, erro: e.message });
        }

        try {
          const r2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Responda apenas OK" }] }] })
          });
          const j2 = await r2.json().catch(() => ({}));
          if (r2.ok) {
            return res.status(200).json({
              gemini_configurada: true,
              gemini_ok: true,
              modelo_ativo: model,
              endpoint: "generateContent",
              status_http: r2.status
            });
          }
          testes.push({ model, endpoint: "generateContent", status: r2.status, erro: j2?.error?.message || "Erro HTTP" });
        } catch (e) {
          testes.push({ model, endpoint: "generateContent", status: 0, erro: e.message });
        }
      }

      return res.status(200).json({
        gemini_configurada: true,
        gemini_ok: false,
        testes
      });
    }

    if (action === "comprovantes") {
      try {
        const includeAll = url.searchParams.get("include_all") === "true";
        const [comprovantesDb, formandosDb] = await Promise.all([
          buscarComprovantesSupabase(includeAll),
          buscarTodosFormandosSupabase()
        ]);

        const formandosMap = new Map((formandosDb || []).map(f => [f.id, f]));
        const formatados = (comprovantesDb || []).map(c => formatarComprovanteParaPainel(c, formandosMap));

        return res.status(200).json({
          status: "success",
          fonte: "supabase",
          total: formatados.length,
          comprovantes: formatados
        });
      } catch (e) {
        console.error("Erro ao listar comprovantes:", e);
        return res.status(500).json({ status: "error", error: e.message });
      }
    }

    return res.status(200).json({
      status: "online",
      versao: "v4-auditor-pdf-blindado",
      canal: "Canal Financeiro Celebra Eventos",
      instancia: INSTANCE_NAME,
      ia_modelo: GEMINI_MODELS[0],
      gemini_configurada: Boolean(GEMINI_API_KEY),
      dias_para_formatura: calcularDiasParaFormatura(),
      timestamp: new Date().toISOString()
    });
  }

  try {
    const body = req.body || {};

    // -----------------------------------------------------------------
    // AÇÃO 1 DO WEB APP: NOTIFICAR DIRETORIA VIA WHATSAPP
    // -----------------------------------------------------------------
    if (body.action === "notificar_diretoria") {
      const telefones = body.telefones || [];
      const mensagem = body.mensagem || "";

      if (!mensagem || telefones.length === 0) {
        return res.status(400).json({ error: "Telefone e mensagem são obrigatórios." });
      }

      const resultados = [];
      for (const tel of telefones) {
        const cleanTel = String(tel).replace(/\D/g, "");
        if (cleanTel.length >= 8) {
          const telCompleto = cleanTel.startsWith("55") || cleanTel.length > 11 ? cleanTel : `55${cleanTel}`;
          const recipient = `${telCompleto}@s.whatsapp.net`;
          try {
            await enviarWhatsApp(recipient, mensagem);
            resultados.push({ tel: cleanTel, status: "enviado" });
          } catch (e) {
            console.error(`Erro envio para ${cleanTel}:`, e);
            resultados.push({ tel: cleanTel, status: "erro", erro: e.message });
          }
        }
      }

      return res.status(200).json({ success: true, count: resultados.length, resultados });
    }

    // -----------------------------------------------------------------
    // AÇÃO 2 DO WEB APP: APROVAR COMPROVANTE PENDENTE COM VÍNCULO REVISADO
    // -----------------------------------------------------------------
    if (body.action === "aprovar_comprovante") {
      const { comprovante_id, formando_id, valor, enviar_confirmacao_whatsapp } = body;
      if (!comprovante_id || !formando_id) {
        return res.status(400).json({ error: "comprovante_id e formando_id são obrigatórios." });
      }

      const [comp, formando] = await Promise.all([
        buscarComprovantePorId(comprovante_id),
        buscarFormandoPorId(formando_id)
      ]);

      if (!formando) {
        return res.status(404).json({ error: "Formando não encontrado no Supabase." });
      }

      const valorFinal = parseValorMonetario(valor ?? comp?.valor);
      if (!valorFinal || valorFinal <= 0) {
        return res.status(400).json({ error: "Valor do comprovante inválido." });
      }

      let saldoAtualizado = null;
      if (!comp || !comp.baixado_no_saldo) {
        saldoAtualizado = await atualizarPagamentoSupabase(formando, valorFinal);
      }

      if (comp) {
        await atualizarComprovanteSupabase(comprovante_id, {
          formando_id: formando.id,
          formando_nome: formando.nome,
          responsavel_nome: formando.responsavel,
          valor: valorFinal,
          status_conferencia: "aprovado_manual",
          baixado_no_saldo: true,
          updated_at: new Date().toISOString()
        });
      }

      if (enviar_confirmacao_whatsapp && comp?.remetente_jid) {
        const novoFalta = saldoAtualizado ? saldoAtualizado.novoFalta : Math.max(0, (parseFloat(formando.valor_falta) || 0) - valorFinal);
        const msgConfirmacao = montarMensagemConfirmacaoBaixa({
          saudacaoNome: escolherSaudacaoSegura({
            formando,
            matchTelefone: false,
            nomePagador: comp.pagador_nome,
            pushName: comp.remetente_push_name
          }),
          formando,
          valor: valorFinal,
          pagadorNome: comp.pagador_nome,
          novoFalta
        });
        await enviarWhatsApp(comp.remetente_jid, msgConfirmacao);
      }

      return res.status(200).json({ success: true, formando: formando.nome, valor: valorFinal, saldoAtualizado });
    }

    // -----------------------------------------------------------------
    // AÇÃO 3 DO WEB APP: ATUALIZAR STATUS (DÚVIDA / REJEITADO / CONVITE EXTRA)
    // -----------------------------------------------------------------
    if (body.action === "atualizar_status_comprovante") {
      const { comprovante_id, status_conferencia, formando_id } = body;
      if (!comprovante_id || !status_conferencia) {
        return res.status(400).json({ error: "comprovante_id e status_conferencia são obrigatórios." });
      }

      const patch = {
        status_conferencia,
        updated_at: new Date().toISOString()
      };

      if (formando_id) {
        const f = await buscarFormandoPorId(formando_id);
        if (f) {
          patch.formando_id = f.id;
          patch.formando_nome = f.nome;
          patch.responsavel_nome = f.responsavel;
        }
      }

      await atualizarComprovanteSupabase(comprovante_id, patch);
      return res.status(200).json({ success: true });
    }

    // -----------------------------------------------------------------
    // AÇÃO 4: TESTE DRY-RUN DE AUDITORIA (NÃO ALTERA SALDO NEM ENVIA WHATSAPP)
    // -----------------------------------------------------------------
    if (body.action === "testar_auditoria_dryrun") {
      const { base64, mimeType: declaredMime, fileName, textoMensagem, contextoRecente, senderPhone, pushName } = body;
      if (!base64) {
        return res.status(400).json({ error: "base64 é obrigatório para dry-run." });
      }
      const t0 = Date.now();
      const { cleanBase64, mimeType } = detectarMimeReal(base64, declaredMime || "", fileName || "");
      const todosFormandos = await buscarTodosFormandosSupabase();
      const resultadoGemini = await analisarComprovanteComGemini({
        cleanBase64,
        mimeType,
        fileName: fileName || "",
        textoMensagem: textoMensagem || "",
        contextoRecente: contextoRecente || "",
        pushName: pushName || "",
        todosFormandos,
        apiKey: GEMINI_API_KEY
      });
      const match = vincularFormandoComSeguranca({
        todosFormandos,
        senderPhone: senderPhone || "",
        pushName: pushName || "",
        ocr: resultadoGemini.ocr,
        textoMensagem: textoMensagem || "",
        nomeArquivo: fileName || "",
        contextoRecente: contextoRecente || ""
      });
      const saudacaoSegura = match.formando
        ? escolherSaudacaoSegura({
            formando: match.formando,
            matchTelefone: match.matchTelefone,
            nomePagador: resultadoGemini.ocr?.nome_pagador,
            pushName: pushName || ""
          })
        : "";
      return res.status(200).json({
        dry_run: true,
        latencia_ms: Date.now() - t0,
        mime_detectado: mimeType,
        modelo_usado: resultadoGemini.modeloUsado,
        erro_ocr: resultadoGemini.erro,
        ocr: resultadoGemini.ocr,
        vinculo: {
          confianca: match.confianca,
          motivo: match.motivo,
          matchTelefone: match.matchTelefone,
          formando_id: match.formando?.id || null,
          formando_nome: match.formando?.nome || null,
          responsavel: match.formando?.responsavel || null,
          saudacao_segura: saudacaoSegura,
          candidatos: match.candidatos
        }
      });
    }

    // -----------------------------------------------------------------
    // WEBHOOK EVOLUTION API (MESSAGES_UPSERT)
    // -----------------------------------------------------------------
    const event = body.event || body.type;
    if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
      return res.status(200).json({ ignored: true, reason: "Evento: " + event });
    }

    const data = body.data || {};
    const key = data.key || {};

    if (key.fromMe) {
      return res.status(200).json({ ignored: true, reason: "Mensagem enviada pela própria instância" });
    }

    const rawRemoteJid = key.remoteJid || "";
    const remoteJidAlt = key.remoteJidAlt || "";
    const targetRecipient = remoteJidAlt.includes("@s.whatsapp.net")
      ? remoteJidAlt
      : (rawRemoteJid || remoteJidAlt);

    if (!targetRecipient || targetRecipient.includes("@g.us") || targetRecipient.includes("@broadcast") || targetRecipient === "0@s.whatsapp.net") {
      return res.status(200).json({ ignored: true, reason: "Grupo, broadcast ou sistema" });
    }

    // Telefone REAL somente se houver JID @s.whatsapp.net (NUNCA usar dígitos de @lid como telefone!)
    const jidComTelefone = rawRemoteJid.includes("@s.whatsapp.net")
      ? rawRemoteJid
      : (remoteJidAlt.includes("@s.whatsapp.net") ? remoteJidAlt : "");
    const senderPhone = jidComTelefone ? jidComTelefone.split("@")[0].replace(/\D/g, "") : "";
    const pushName = limparPushName(data.pushName || "");
    const messageId = key.id || "";

    const extraido = extrairMensagemDesembrulhada(data);
    if (extraido.ignorar) {
      return res.status(200).json({ ignored: true, reason: extraido.motivoIgnorar });
    }

    const { textMsg, isMediaComprovante, declaredMime, fileName } = extraido;

    console.log(
      `📱 [Financeiro Celebra V4] Recipient: ${targetRecipient} | Tel: ${senderPhone || "LID"} | Push: "${pushName}" | Mídia: ${isMediaComprovante} (${declaredMime || "-"}) | Arq: "${fileName}" | Texto: "${textMsg.slice(0, 100)}"`
    );

    // =================================================================
    // CASO 1: RECEBIMENTO DE COMPROVANTE (PDF OU IMAGEM)
    // =================================================================
    if (isMediaComprovante) {
      // 1. Deduplicação por ID da mensagem do WhatsApp
      if (messageId) {
        const jaExiste = await buscarComprovantePorMessageId(messageId);
        if (jaExiste) {
          console.log(`🔁 [Deduplicação] Mensagem ${messageId} já processada anteriormente.`);
          return res.status(200).json({ ignored: true, reason: "Mensagem duplicada já processada" });
        }
      }

      // 2. Buscar base64 (do payload ou da API da Evolution)
      let mediaBase64 = data.base64 || "";
      if ((!mediaBase64 || mediaBase64.length < 100) && key.id) {
        mediaBase64 = await buscarBase64Evolution(key, data.message);
      }

      const { cleanBase64, mimeType } = detectarMimeReal(mediaBase64, declaredMime, fileName);

      // 3. Carregar todos os formandos + contexto recente da conversa (últimos 10 min)
      const [todosFormandos, contextoRecente] = await Promise.all([
        buscarTodosFormandosSupabase(),
        obterContextoRecenteRemetente(targetRecipient, rawRemoteJid, messageId)
      ]);

      // Registrar que houve interação de comprovante (evita spam de saudação depois)
      await registrarInteracaoSupabase(targetRecipient, senderPhone, "comprovante", textMsg || fileName || mimeType);

      // 4. Análise Multimodal Profunda com Gemini (PDF nativo + Imagem + Lista de Formandos)
      let ocr = null;
      let ocrErro = null;

      if (!GEMINI_API_KEY) {
        ocrErro = "GEMINI_API_KEY não configurada no servidor (Vercel).";
        console.error("❌ [Gemini] GEMINI_API_KEY ausente!");
      } else if (!cleanBase64) {
        ocrErro = "Não foi possível baixar o conteúdo binário do arquivo no WhatsApp.";
        console.error("❌ [Mídia] Base64 vazio para", messageId);
      } else {
        const resultadoGemini = await analisarComprovanteComGemini({
          cleanBase64,
          mimeType,
          fileName,
          textoMensagem: textMsg,
          contextoRecente,
          pushName,
          todosFormandos,
          apiKey: GEMINI_API_KEY
        });
        ocr = resultadoGemini.ocr;
        ocrErro = resultadoGemini.erro;
      }

      // 5. Falha na leitura da IA -> NUNCA chutar R$ 430,00 nem dar baixa automática!
      if (!ocr) {
        const matchParcial = vincularFormandoComSeguranca({
          todosFormandos,
          senderPhone,
          pushName,
          ocr: null,
          textoMensagem: textMsg,
          nomeArquivo: fileName,
          contextoRecente
        });

        await salvarComprovanteSupabase({
          whatsapp_message_id: messageId || null,
          remetente_jid: targetRecipient,
          remetente_telefone: senderPhone || null,
          remetente_push_name: pushName || null,
          tipo_documento: "erro_leitura",
          mime_type: mimeType,
          nome_arquivo: fileName || null,
          valor: null,
          mensagem_texto: [textMsg, contextoRecente].filter(Boolean).join(" | ") || null,
          eh_convite_extra: detectarConviteExtraTexto(`${textMsg} ${contextoRecente}`),
          formando_id: matchParcial.formando?.id || null,
          formando_nome: matchParcial.formando?.nome || null,
          responsavel_nome: matchParcial.formando?.responsavel || null,
          confianca_leitura: "baixa",
          confianca_vinculo: matchParcial.confianca,
          motivo_vinculo: `Falha na leitura automática (${ocrErro || "erro desconhecido"}). ${matchParcial.motivo}`,
          candidatos_json: matchParcial.candidatos,
          status_conferencia: "erro_leitura",
          baixado_no_saldo: false,
          ocr_json: { erro: ocrErro }
        });

        const saudacaoErro = matchParcial.matchTelefone && matchParcial.formando
          ? escolherSaudacaoSegura({ formando: matchParcial.formando, matchTelefone: true, nomePagador: "", pushName })
          : "";
        const cumprimento = saudacaoErro ? `Olá, *${saudacaoErro}*!` : "Olá!";

        const respostaErro = `${cumprimento} 🎓✨\n\nRecebemos o seu arquivo! Nossa equipe financeira vai conferir os dados do comprovante e realizar a baixa no sistema em instantes.\n\nAgradecemos o envio! Qualquer dúvida, estamos à disposição. 💼✨`;
        await enviarWhatsApp(targetRecipient, respostaErro);

        return res.status(200).json({
          success: true,
          acao: "encaminhado_erro_ocr",
          erro: ocrErro,
          candidato: matchParcial.formando?.nome || null
        });
      }

      // 6. Documentos que NÃO são comprovantes pagos (foto aleatória, boleto em aberto, agendamento)
      if (ocr.tipo_documento === "nao_comprovante") {
        await salvarComprovanteSupabase({
          whatsapp_message_id: messageId || null,
          remetente_jid: targetRecipient,
          remetente_telefone: senderPhone || null,
          remetente_push_name: pushName || null,
          tipo_documento: "nao_comprovante",
          mime_type: mimeType,
          nome_arquivo: fileName || null,
          mensagem_texto: textMsg || null,
          confianca_leitura: ocr.confianca_leitura || "media",
          confianca_vinculo: "SEM_VINCULO",
          motivo_vinculo: ocr.observacoes_auditoria || "Arquivo recebido não é um comprovante de pagamento.",
          status_conferencia: "ignorado",
          baixado_no_saldo: false,
          ocr_json: ocr
        });

        console.log(`ℹ️ [Não Comprovante] Ignorado silenciosamente: ${ocr.observacoes_auditoria || fileName}`);
        return res.status(200).json({ success: true, acao: "ignorado_nao_comprovante" });
      }

      if (ocr.tipo_documento === "boleto_em_aberto") {
        await salvarComprovanteSupabase({
          whatsapp_message_id: messageId || null,
          remetente_jid: targetRecipient,
          remetente_telefone: senderPhone || null,
          remetente_push_name: pushName || null,
          tipo_documento: "boleto_em_aberto",
          mime_type: mimeType,
          nome_arquivo: fileName || null,
          valor: parseValorMonetario(ocr.valor),
          mensagem_texto: textMsg || null,
          confianca_leitura: ocr.confianca_leitura || "alta",
          confianca_vinculo: "SEM_VINCULO",
          motivo_vinculo: "PDF identificado como boleto em aberto (não é comprovante de pagamento efetuado).",
          status_conferencia: "ignorado",
          baixado_no_saldo: false,
          ocr_json: ocr
        });

        const msgBoleto = `Olá! 🎓✨\n\nRecebemos o arquivo do boleto, mas identificamos que ele ainda é um *boleto para pagamento* (não é o comprovante de pagamento efetivado).\n\nAssim que realizar o pagamento, basta nos enviar o *comprovante* por aqui! Caso tenha alguma dúvida sobre este boleto, nossa equipe financeira já vai verificar para você. 💼`;
        await enviarWhatsApp(targetRecipient, msgBoleto);
        return res.status(200).json({ success: true, acao: "aviso_boleto_em_aberto" });
      }

      if (ocr.tipo_documento === "agendamento") {
        const valorAgendado = parseValorMonetario(ocr.valor);
        await salvarComprovanteSupabase({
          whatsapp_message_id: messageId || null,
          remetente_jid: targetRecipient,
          remetente_telefone: senderPhone || null,
          remetente_push_name: pushName || null,
          tipo_documento: "agendamento",
          mime_type: mimeType,
          nome_arquivo: fileName || null,
          valor: valorAgendado,
          data_pagamento: ocr.data_pagamento || null,
          pagador_nome: ocr.nome_pagador || null,
          pagador_cpf: ocr.cpf_pagador || null,
          banco_pagador: ocr.banco_pagador || null,
          mensagem_texto: textMsg || null,
          confianca_leitura: ocr.confianca_leitura || "alta",
          confianca_vinculo: "SEM_VINCULO",
          motivo_vinculo: "Documento é um AGENDAMENTO (pagamento ainda não efetivado).",
          status_conferencia: "pendente_conferencia",
          baixado_no_saldo: false,
          ocr_json: ocr
        });

        const trechoValor = valorAgendado ? ` no valor de *R$ ${formatarBRL(valorAgendado)}*` : "";
        const msgAgendamento = `Olá! 🎓✨\n\nIdentificamos que o arquivo enviado${trechoValor} é um *agendamento de pagamento* (ainda não efetivado).\n\n📌 *Importante:* A baixa no sistema só é feita após a conclusão do pagamento. Assim que for debitado na data agendada, por favor envie o *comprovante definitivo* por aqui!\n\nQualquer dúvida, nossa equipe financeira está à disposição. 💼`;
        await enviarWhatsApp(targetRecipient, msgAgendamento);
        return res.status(200).json({ success: true, acao: "aviso_agendamento" });
      }

      // 7. Deduplicação por ID da transação bancária (Pix E2E ID / autenticação)
      const idTransacaoLimpo = (ocr.id_transacao || "").trim();
      if (idTransacaoLimpo.length >= 12) {
        const dupTx = await buscarComprovantePorTransacao(idTransacaoLimpo);
        if (dupTx) {
          const valorDup = parseValorMonetario(ocr.valor) || parseValorMonetario(dupTx.valor);
          const trechoVal = valorDup ? ` no valor de *R$ ${formatarBRL(valorDup)}*` : "";
          const msgDup = `Olá! 🎓✨\n\nIdentificamos que este comprovante${trechoVal} já foi recebido e registrado anteriormente no nosso sistema! ✅\n\nNão se preocupe, ele não será contabilizado em duplicidade. Qualquer dúvida, nossa equipe financeira está à disposição. 💼`;
          await enviarWhatsApp(targetRecipient, msgDup);
          return res.status(200).json({ success: true, acao: "comprovante_duplicado_tx", id_transacao: idTransacaoLimpo });
        }
      }

      // 8. Extrair valor REAL (jamais usar 430.00 como fallback!)
      const valorDetectado = parseValorMonetario(ocr.valor);
      const isConviteExtra = Boolean(
        ocr.eh_convite_extra ||
        detectarConviteExtraTexto(`${textMsg} ${ocr.descricao_ou_mensagem || ""} ${contextoRecente} ${fileName}`)
      );

      // 9. Motor de Vínculo Blindado (Telefone normalizado + CPF LGPD + Nome/Sobrenome exato + Cross-check IA)
      const match = vincularFormandoComSeguranca({
        todosFormandos,
        senderPhone,
        pushName,
        ocr,
        textoMensagem: textMsg,
        nomeArquivo: fileName,
        contextoRecente
      });

      const formando = match.formando;
      const saudacaoNome = (formando && (match.confianca === "ALTA" || match.matchTelefone))
        ? escolherSaudacaoSegura({
            formando,
            matchTelefone: match.matchTelefone,
            nomePagador: ocr.nome_pagador,
            pushName
          })
        : "";

      // 10. Trava de Segurança Financeira antes de qualquer baixa automática
      let bloqueioFinanceiro = null;
      if (valorDetectado === null || valorDetectado <= 0) {
        bloqueioFinanceiro = "Valor do comprovante não pôde ser lido com segurança pela IA.";
      } else if (ocr.eh_para_celebra === false) {
        bloqueioFinanceiro = `Favorecido divergente da Celebra Eventos (${ocr.nome_favorecido || "não identificado"}).`;
      } else if (ocr.confianca_leitura === "baixa") {
        bloqueioFinanceiro = "Imagem/PDF com baixa legibilidade — requer conferência visual.";
      } else if (formando) {
        const faltaAtual = parseFloat(formando.valor_falta) || 0;
        if (formando.status === "desistencia") {
          bloqueioFinanceiro = `Formando ${formando.nome} está marcado como DESISTÊNCIA no CRM — requer conferência da diretoria.`;
        } else if (formando.status === "quitado" || faltaAtual <= 0.01) {
          bloqueioFinanceiro = `Formando ${formando.nome} já consta como 100% QUITADO no CRM — verificar se trata-se de convite extra ou duplicidade.`;
        } else if (valorDetectado > faltaAtual + 10) {
          bloqueioFinanceiro = `Valor pago (R$ ${formatarBRL(valorDetectado)}) supera o saldo em aberto (R$ ${formatarBRL(faltaAtual)}) — verificar se inclui convites extras.`;
        }
      }

      // ---------------------------------------------------------------
      // RAMO A: CONVITE EXTRA (nunca altera saldo da formatura!)
      // ---------------------------------------------------------------
      if (isConviteExtra) {
        await salvarComprovanteSupabase({
          whatsapp_message_id: messageId || null,
          id_transacao: idTransacaoLimpo || null,
          remetente_jid: targetRecipient,
          remetente_telefone: senderPhone || null,
          remetente_push_name: pushName || null,
          tipo_documento: ocr.tipo_documento,
          mime_type: mimeType,
          nome_arquivo: fileName || null,
          valor: valorDetectado,
          data_pagamento: ocr.data_pagamento || null,
          hora_pagamento: ocr.hora_pagamento || null,
          pagador_nome: ocr.nome_pagador || null,
          pagador_cpf: ocr.cpf_pagador || null,
          banco_pagador: ocr.banco_pagador || null,
          favorecido_nome: ocr.nome_favorecido || null,
          chave_pix_destino: ocr.chave_pix_destino || null,
          eh_para_celebra: ocr.eh_para_celebra ?? null,
          descricao_pix: ocr.descricao_ou_mensagem || null,
          mensagem_texto: [textMsg, contextoRecente].filter(Boolean).join(" | ") || null,
          eh_convite_extra: true,
          qtd_convites_extras: ocr.qtd_convites_extras || extrairQtdConvites(`${textMsg} ${ocr.descricao_ou_mensagem || ""}`),
          formando_id: formando?.id || null,
          formando_nome: formando?.nome || null,
          responsavel_nome: formando?.responsavel || null,
          confianca_leitura: ocr.confianca_leitura,
          confianca_vinculo: match.confianca,
          motivo_vinculo: `Convite extra identificado. ${match.motivo}`,
          candidatos_json: match.candidatos,
          status_conferencia: "convite_extra",
          baixado_no_saldo: false,
          ocr_json: ocr
        });

        const cumprimento = saudacaoNome ? `Olá, *${saudacaoNome}*!` : "Olá!";
        const trechoValor = valorDetectado ? ` no valor de *R$ ${formatarBRL(valorDetectado)}*` : "";
        const trechoAluno = (formando && match.confianca === "ALTA") ? ` referente ao(à) formando(a) *${formando.nome}*` : "";
        const respostaExtra = `${cumprimento} 🎓✨\n\nIdentificamos o envio do comprovante${trechoValor} referente a *Convites Extras*${trechoAluno}.\n\n📌 *Status:* Encaminhado para conferência da nossa equipe financeira. Os convites extras serão vinculados ao cadastro sem alterar o contrato original da formatura!\n\nQualquer dúvida, nossa equipe está à disposição. 💼🎉`;
        await enviarWhatsApp(targetRecipient, respostaExtra);

        return res.status(200).json({
          success: true,
          acao: "convite_extra_registrado",
          valor: valorDetectado,
          formando: formando?.nome || null,
          confianca: match.confianca
        });
      }

      // ---------------------------------------------------------------
      // RAMO B: BAIXA AUTOMÁTICA SOMENTE COM CERTEZA ALTA E ZERO BLOQUEIOS
      // ---------------------------------------------------------------
      if (formando && match.confianca === "ALTA" && !bloqueioFinanceiro) {
        const { novoFalta } = await atualizarPagamentoSupabase(formando, valorDetectado);

        await salvarComprovanteSupabase({
          whatsapp_message_id: messageId || null,
          id_transacao: idTransacaoLimpo || null,
          remetente_jid: targetRecipient,
          remetente_telefone: senderPhone || null,
          remetente_push_name: pushName || null,
          tipo_documento: ocr.tipo_documento,
          mime_type: mimeType,
          nome_arquivo: fileName || null,
          valor: valorDetectado,
          data_pagamento: ocr.data_pagamento || null,
          hora_pagamento: ocr.hora_pagamento || null,
          pagador_nome: ocr.nome_pagador || null,
          pagador_cpf: ocr.cpf_pagador || null,
          banco_pagador: ocr.banco_pagador || null,
          favorecido_nome: ocr.nome_favorecido || null,
          chave_pix_destino: ocr.chave_pix_destino || null,
          eh_para_celebra: ocr.eh_para_celebra ?? null,
          descricao_pix: ocr.descricao_ou_mensagem || null,
          mensagem_texto: [textMsg, contextoRecente].filter(Boolean).join(" | ") || null,
          eh_convite_extra: false,
          formando_id: formando.id,
          formando_nome: formando.nome,
          responsavel_nome: formando.responsavel,
          confianca_leitura: ocr.confianca_leitura,
          confianca_vinculo: "ALTA",
          motivo_vinculo: match.motivo,
          candidatos_json: match.candidatos,
          status_conferencia: "aprovado_auto",
          baixado_no_saldo: true,
          ocr_json: ocr
        });

        const respostaAuto = montarMensagemConfirmacaoBaixa({
          saudacaoNome,
          formando,
          valor: valorDetectado,
          pagadorNome: ocr.nome_pagador,
          novoFalta
        });
        await enviarWhatsApp(targetRecipient, respostaAuto);

        return res.status(200).json({
          success: true,
          acao: "baixa_automatica_confirmada",
          valor: valorDetectado,
          formando: formando.nome,
          motivo: match.motivo
        });
      }

      // ---------------------------------------------------------------
      // RAMO C: CONFERÊNCIA SEGURA (DÚVIDA, AMBÍGUO, TERCEIRO, CONFLITO OU TRAVA FINANCEIRA)
      // ---------------------------------------------------------------
      const motivoFinal = [bloqueioFinanceiro, match.motivo, ocr.observacoes_auditoria].filter(Boolean).join(" • ");

      await salvarComprovanteSupabase({
        whatsapp_message_id: messageId || null,
        id_transacao: idTransacaoLimpo || null,
        remetente_jid: targetRecipient,
        remetente_telefone: senderPhone || null,
        remetente_push_name: pushName || null,
        tipo_documento: ocr.tipo_documento,
        mime_type: mimeType,
        nome_arquivo: fileName || null,
        valor: valorDetectado,
        data_pagamento: ocr.data_pagamento || null,
        hora_pagamento: ocr.hora_pagamento || null,
        pagador_nome: ocr.nome_pagador || null,
        pagador_cpf: ocr.cpf_pagador || null,
        banco_pagador: ocr.banco_pagador || null,
        favorecido_nome: ocr.nome_favorecido || null,
        chave_pix_destino: ocr.chave_pix_destino || null,
        eh_para_celebra: ocr.eh_para_celebra ?? null,
        descricao_pix: ocr.descricao_ou_mensagem || null,
        mensagem_texto: [textMsg, contextoRecente].filter(Boolean).join(" | ") || null,
        eh_convite_extra: false,
        formando_id: formando?.id || null,
        formando_nome: formando?.nome || null,
        responsavel_nome: formando?.responsavel || null,
        confianca_leitura: ocr.confianca_leitura,
        confianca_vinculo: match.confianca,
        motivo_vinculo: motivoFinal,
        candidatos_json: match.candidatos,
        status_conferencia: "pendente_conferencia",
        baixado_no_saldo: false,
        ocr_json: ocr
      });

      const cumprimentoSeguro = (saudacaoNome && match.matchTelefone && match.confianca !== "CONFLITO")
        ? `Olá, *${saudacaoNome}*!`
        : "Olá!";
      const trechoValor = valorDetectado ? ` no valor de *R$ ${formatarBRL(valorDetectado)}*` : "";

      let respostaConferencia = "";
      if (ocr.eh_para_celebra === false) {
        respostaConferencia = `${cumprimentoSeguro} 🎓✨\n\nRecebemos o comprovante${trechoValor}, mas notamos que o destinatário exibido no arquivo parece diferente da conta oficial da *Celebra Eventos*.\n\n📌 *Status:* Nossa equipe financeira vai conferir este comprovante com atenção e retornar em breve!\n\nQualquer dúvida, estamos à disposição. 💼`;
      } else {
        respostaConferencia = `${cumprimentoSeguro} 🎓✨\n\nRecebemos o seu comprovante${trechoValor}!\n\n📌 *Status:* Encaminhado para conferência da nossa equipe financeira para validar e vincular com segurança ao cadastro correto do formando.\n\nAgradecemos o envio! Assim que conferido, atualizamos no sistema. 💼✨`;
      }

      await enviarWhatsApp(targetRecipient, respostaConferencia);

      return res.status(200).json({
        success: true,
        acao: "encaminhado_conferencia",
        valor: valorDetectado,
        confianca: match.confianca,
        motivo: motivoFinal,
        candidato: formando?.nome || null
      });
    }

    // =================================================================
    // CASO 2: MENSAGEM DE TEXTO COMUM
    // =================================================================
    if (textMsg) {
      // Sempre guarda o texto para dar contexto caso o comprovante chegue logo depois!
      await registrarInteracaoSupabase(targetRecipient, senderPhone, "mensagem_texto", textMsg);

      if (ehSaudacaoIsolada(textMsg)) {
        const emCooldown = await verificarCooldownSaudacao(targetRecipient, rawRemoteJid);
        if (!emCooldown) {
          const saudacao = `Olá! Seja bem-vindo(a) ao *Canal Financeiro Oficial da Celebra Eventos*! 💳🎓\n\nEste canal é exclusivo para atendimento financeiro, envio de comprovantes (Pix ou boleto pago) e baixa de parcelas da formatura do *Terceirão Aprovado (Guerrah Hall)*.\n\n📸 *Envio de Comprovante:*\nBasta enviar a *foto ou PDF* do comprovante aqui na conversa (se puder, informe o nome completo do formando junto). Nosso sistema analisa e encaminha para baixa no cadastro!\n\nCaso tenha alguma dúvida financeira, pode enviar sua mensagem que nossa equipe responderá em breve. 💼✨`;
          await enviarWhatsApp(targetRecipient, saudacao);
          await registrarInteracaoSupabase(targetRecipient, senderPhone, "saudacao_enviada", textMsg);
          return res.status(200).json({ success: true, acao: "auto_reply_saudacao" });
        }
        return res.status(200).json({ success: true, acao: "saudacao_ignorada_cooldown" });
      }
    }

    return res.status(200).json({ success: true, acao: "mensagem_registrada" });
  } catch (err) {
    console.error("Erro handler webhook:", err);
    return res.status(500).json({ error: err.message });
  }
}

// =========================================================================
// MÓDULO 1: EXTRAÇÃO DE MENSAGEM E DETECÇÃO REAL DE MIME (PDF & IMAGEM)
// =========================================================================

export function extrairMensagemDesembrulhada(data) {
  let msg = data?.message || {};

  // Desembrulha envelopes comuns do WhatsApp (mensagens temporárias, visualização única, PDF com legenda)
  for (let i = 0; i < 4; i++) {
    if (msg.ephemeralMessage?.message) {
      msg = msg.ephemeralMessage.message;
    } else if (msg.viewOnceMessage?.message) {
      msg = msg.viewOnceMessage.message;
    } else if (msg.viewOnceMessageV2?.message) {
      msg = msg.viewOnceMessageV2.message;
    } else if (msg.viewOnceMessageV2Extension?.message) {
      msg = msg.viewOnceMessageV2Extension.message;
    } else if (msg.documentWithCaptionMessage?.message) {
      msg = msg.documentWithCaptionMessage.message;
    } else {
      break;
    }
  }

  const keys = Object.keys(msg).filter(k => k !== "messageContextInfo" && k !== "senderKeyDistributionMessage");
  if (keys.length === 0) {
    return { ignorar: true, motivoIgnorar: "Mensagem vazia ou apagada" };
  }

  if (msg.reactionMessage || msg.protocolMessage || msg.pollUpdateMessage || msg.receiptMessage) {
    return { ignorar: true, motivoIgnorar: "Reação ou evento de protocolo" };
  }

  const imgMsg = msg.imageMessage || null;
  const docMsg = msg.documentMessage || null;

  const caption = imgMsg?.caption || docMsg?.caption || "";
  const textMsg = (msg.conversation || msg.extendedTextMessage?.text || caption || "").trim();

  const declaredMime = String(imgMsg?.mimetype || docMsg?.mimetype || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  const fileName = String(docMsg?.fileName || docMsg?.title || "").trim();

  // Rejeita explicitamente vídeo, áudio, figurinha, contato e localização
  if (msg.videoMessage || msg.audioMessage || msg.stickerMessage || msg.contactMessage || msg.locationMessage) {
    return {
      ignorar: false,
      textMsg,
      isMediaComprovante: false,
      declaredMime,
      fileName
    };
  }

  let isMediaComprovante = false;
  if (imgMsg) {
    isMediaComprovante = true;
  } else if (docMsg) {
    const ehPdf = declaredMime === "application/pdf" || /\.pdf$/i.test(fileName);
    const ehImgDoc = declaredMime.startsWith("image/") || /\.(jpe?g|png|webp|heic|gif)$/i.test(fileName);
    isMediaComprovante = ehPdf || ehImgDoc;
  }

  return {
    ignorar: false,
    textMsg,
    isMediaComprovante,
    declaredMime,
    fileName
  };
}

export function detectarMimeReal(base64Raw, declaredMime = "", fileName = "") {
  let raw = String(base64Raw || "").trim();
  let mimeFromPrefix = "";

  if (raw.startsWith("data:") && raw.includes(",")) {
    const header = raw.slice(5, raw.indexOf(","));
    mimeFromPrefix = header.split(";")[0].toLowerCase().trim();
    raw = raw.slice(raw.indexOf(",") + 1).trim();
  }

  // Remove quebras de linha no base64
  const cleanBase64 = raw.replace(/\s+/g, "");

  // Sniff pelos magic bytes do arquivo real (mais confiável que header do WhatsApp!)
  let sniffedMime = "";
  if (cleanBase64.startsWith("JVBERi")) {
    sniffedMime = "application/pdf";
  } else if (cleanBase64.startsWith("/9j/")) {
    sniffedMime = "image/jpeg";
  } else if (cleanBase64.startsWith("iVBORw0KGgo")) {
    sniffedMime = "image/png";
  } else if (cleanBase64.startsWith("UklGR")) {
    sniffedMime = "image/webp";
  } else if (cleanBase64.startsWith("R0lGOD")) {
    sniffedMime = "image/gif";
  }

  let mimeType = sniffedMime || mimeFromPrefix || declaredMime;
  if (!mimeType) {
    if (/\.pdf$/i.test(fileName)) mimeType = "application/pdf";
    else if (/\.png$/i.test(fileName)) mimeType = "image/png";
    else if (/\.webp$/i.test(fileName)) mimeType = "image/webp";
    else mimeType = "image/jpeg";
  }

  return { cleanBase64, mimeType };
}

// =========================================================================
// MÓDULO 2: AUDITORIA MULTIMODAL COM GEMINI (PDF NATIVO + IMAGEM)
// =========================================================================

async function analisarComprovanteComGemini({
  cleanBase64,
  mimeType,
  fileName,
  textoMensagem,
  contextoRecente,
  pushName,
  todosFormandos,
  apiKey
}) {
  const listaCompactaFormandos = (todosFormandos || [])
    .map(f => {
      const cpfDig = String(f.cpf || "").replace(/\D/g, "");
      const cpfMeio = cpfDig.length === 11 ? cpfDig.slice(3, 9) : cpfDig;
      return `#${f.id} | Aluno: ${f.nome} | Resp: ${f.responsavel || "-"} | CPF_meio: ${cpfMeio || "-"} | Falta: R$${f.valor_falta ?? "-"} | Status: ${f.status || "-"}`;
    })
    .join("\n");

  const promptAuditoria = `Você é o AUDITOR FINANCEIRO SÊNIOR da Celebra Eventos (Formatura do Terceirão — Colégio Aprovado, Macaé-RJ, Guerrah Hall).
Analise CUIDADOSAMENTE o documento/imagem anexado (pode ser PDF bancário ou print de celular) e o contexto da conversa.

DADOS OFICIAIS DA RECEBEDORA (CELEBRA EVENTOS — SEMPRE É O FAVORECIDO/DESTINO, NUNCA O PAGADOR):
- Empresa/Beneficiária: Celebra Eventos / Luana Marques Vianna
- CNPJ: 50.130.618/0001-44 (50130618000144)
- Chaves Pix oficiais: 50.130.618/0001-44 | +5522998975785 / (22) 99897-5785 | celebraeventosofc@gmail.com
- Bancos oficiais da Celebra: Santander e Banco Cora

REGRAS CRÍTICAS DE AUDITORIA (LEIA COM ATENÇÃO):
1. CLASSIFICAÇÃO DO DOCUMENTO (tipo_documento):
   - "comprovante_pix": Pix CONCLUÍDO / REALIZADO / EFETIVADO / ENVIADO.
   - "comprovante_boleto": Comprovante de PAGAMENTO DE BOLETO já efetuado (contém autenticação/data de pagamento/valor pago).
   - "comprovante_transferencia": TED/DOC/transferência já efetivada.
   - "comprovante_cartao": Comprovante de pagamento no cartão aprovado.
   - "boleto_em_aberto": ATENÇÃO! Se o PDF for um BOLETO PARA PAGAR (ficha de compensação, linha digitável para pagar, vencimento, "Pagar até", sem autenticação de pagamento), classifique como "boleto_em_aberto" — NÃO é comprovante pago!
   - "agendamento": Se o comprovante disser "Pix agendado", "Pagamento agendado", "Agendamento realizado", classifique como "agendamento"!
   - "nao_comprovante": Foto pessoal, print de conversa do WhatsApp, vestido, tabela, convite, anúncio, etc.

2. SEPARAÇÃO RIGOROSA DE PAGADOR vs FAVORECIDO (ERRO ZERO):
   - Bancos brasileiros (Itaú, Bradesco, Next, Santander, Nubank, Caixa, BB, Inter, C6, Sicredi, Sicoob, PicPay, Mercado Pago, PagBank, Cora, BTG, XP) variam a ordem: alguns mostram "Para / Quem recebeu / Favorecido" NO TOPO e "De / Quem pagou / Pagador / Origem" EMBAIXO!
   - Leia TODOS os rótulos ("De:", "Origem:", "Pagador:", "Dados do pagador", "Conta debitada" vs "Para:", "Destino:", "Favorecido:", "Recebedor:", "Beneficiário").
   - NUNCA coloque "Celebra Eventos", "Luana Marques Vianna" ou o CNPJ 50.130.618/0001-44 em nome_pagador ou cpf_pagador!
   - Extraia nome_pagador e cpf_pagador EXATAMENTE como aparecem no comprovante (ex: "***.066.527-**" ou "091.066.527-35").

3. VALOR MONETÁRIO EXATO:
   - Leia o valor principal da transação em reais (formato brasileiro: "R$ 1.720,00" -> 1720.00; "R$ 430,00" -> 430.00; "R$ 950,00" -> 950.00).
   - NUNCA confunda tarifa (R$ 0,00), saldo em conta, número da agência/conta ou número de parcelas ("7/8") com o valor pago!
   - Se o valor não estiver legível com certeza, retorne null.

4. DESCRIÇÃO / OBSERVAÇÃO DO PIX & CONVITES EXTRAS:
   - Leia o campo "Descrição", "Mensagem", "Identificação" ou "Observação" DENTRO do comprovante — pais frequentemente escrevem o nome do aluno ou "convite extra" lá!
   - Marque eh_convite_extra=true se a descrição do comprovante, a legenda ou o contexto recente mencionar "convite", "convites", "extra", "mesa extra".

5. VÍNCULO COM A LISTA OFICIAL DE FORMANDOS (CONSERVADOR — NUNCA CHUTE):
   - Lembre-se: às vezes quem paga é o PAI, MÃE, AVÓ, TIO ou EMPRESA do responsável (sobrenome igual ou diferente do responsável cadastrado).
   - Cuidado com nomes parecidos/duplicados: existem 3 "Ana Clara", 2 "Davi", 2 "Isabella", 2 "João Pedro", 2 "Lucas", 3 "Maria", "Gabriel" vs "Gabriela", "Rafael" vs "Rafaella", "Luiz" vs "Luiza", "Lara" vs "Ana Clara"!
   - Só indique sugestao_confianca="alta" se houver correspondência inequívoca (CPF batendo nos dígitos visíveis, nome completo do responsável, ou nome+sobrenome único do aluno). Se houver qualquer ambiguidade (ex: só escreveu "Davi" ou "Ana Clara" sem sobrenome e o pagador não confirma qual), coloque sugestao_confianca="baixa" ou "nenhuma" e explique na sugestao_justificativa!

CONTEXTO DA MENSAGEM NO WHATSAPP:
- Nome no perfil WhatsApp (pushName): ${pushName || "(não informado)"}
- Nome do arquivo anexado: ${fileName || "(não informado)"}
- Legenda enviada com o arquivo: ${textoMensagem || "(sem legenda)"}
- Mensagens recentes desta pessoa (últimos 10 min): ${contextoRecente || "(nenhuma)"}

LISTA OFICIAL DOS 48 FORMANDOS (CRM SUPABASE):
${listaCompactaFormandos}

Retorne estritamente o JSON conforme o schema.`;

  let ultimoErro = "Nenhuma tentativa executada";

  for (const model of GEMINI_MODELS) {
    // Tentativa 1: Interactions API (oficial para Gemini 4 / PDFs e imagens + JSON Schema)
    const resInter = await chamarGeminiInteractions({
      model,
      apiKey,
      prompt: promptAuditoria,
      cleanBase64,
      mimeType
    });

    if (resInter.ok) {
      return { ocr: resInter.data, erro: null, modeloUsado: model };
    }
    ultimoErro = resInter.erro;

    // Se for erro de autenticação (401/403), não adianta tentar outro modelo/endpoint
    if (resInter.status === 401 || resInter.status === 403) {
      return { ocr: null, erro: ultimoErro, modeloUsado: model };
    }

    // Tentativa 2: generateContent fallback no mesmo modelo
    const resGen = await chamarGeminiGenerateContent({
      model,
      apiKey,
      prompt: promptAuditoria,
      cleanBase64,
      mimeType
    });

    if (resGen.ok) {
      return { ocr: resGen.data, erro: null, modeloUsado: model };
    }
    ultimoErro = resGen.erro;

    if (resGen.status === 401 || resGen.status === 403) {
      return { ocr: null, erro: ultimoErro, modeloUsado: model };
    }
  }

  return { ocr: null, erro: ultimoErro, modeloUsado: null };
}

async function chamarGeminiInteractions({ model, apiKey, prompt, cleanBase64, mimeType }) {
  try {
    const mediaBlock = mimeType === "application/pdf"
      ? { type: "document", data: cleanBase64, mime_type: "application/pdf" }
      : { type: "image", data: cleanBase64, mime_type: mimeType };

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "Api-Revision": "2026-05-20"
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        store: false,
        input: [
          mediaBlock,
          { type: "text", text: prompt }
        ],
        generation_config: {
          temperature: 0
        },
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: SCHEMA_AUDITORIA_COMPROVANTE
        }
      })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || json?.[0]?.error?.message || `HTTP ${res.status}`;
      console.error(`❌ [Gemini Interactions ${model}] HTTP ${res.status}:`, msg);
      return { ok: false, status: res.status, erro: `Interactions ${model} (${res.status}): ${msg}` };
    }

    // Extrai texto da resposta (suporta formato `steps` v2 e legado `outputs`)
    let rawText = "";
    if (Array.isArray(json.steps)) {
      const modelSteps = json.steps.filter(s => s.type === "model_output");
      const lastStep = modelSteps[modelSteps.length - 1];
      if (lastStep && Array.isArray(lastStep.content)) {
        rawText = lastStep.content
          .filter(c => c.type === "text" && c.text)
          .map(c => c.text)
          .join("");
      }
    } else if (Array.isArray(json.outputs)) {
      rawText = json.outputs
        .filter(o => o.type === "text" && o.text)
        .map(o => o.text)
        .join("");
    }

    const parsed = parseJsonSeguro(rawText);
    if (!parsed) {
      return { ok: false, status: res.status, erro: `JSON inválido retornado por ${model}` };
    }
    return { ok: true, status: res.status, data: parsed };
  } catch (e) {
    return { ok: false, status: 0, erro: `Exceção Interactions ${model}: ${e.message}` };
  }
}

async function chamarGeminiGenerateContent({ model, apiKey, prompt, cleanBase64, mimeType }) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: mimeType, data: cleanBase64 } },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: SCHEMA_AUDITORIA_COMPROVANTE
        }
      })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      console.error(`❌ [Gemini generateContent ${model}] HTTP ${res.status}:`, msg);
      return { ok: false, status: res.status, erro: `generateContent ${model} (${res.status}): ${msg}` };
    }

    const rawText = json?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    const parsed = parseJsonSeguro(rawText);
    if (!parsed) {
      return { ok: false, status: res.status, erro: `JSON inválido em generateContent ${model}` };
    }
    return { ok: true, status: res.status, data: parsed };
  } catch (e) {
    return { ok: false, status: 0, erro: `Exceção generateContent ${model}: ${e.message}` };
  }
}

function parseJsonSeguro(txt) {
  if (!txt) return null;
  try {
    const clean = txt.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    const start = txt.indexOf("{");
    const end = txt.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(txt.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

// =========================================================================
// MÓDULO 3: MOTOR DE VÍNCULO BLINDADO (ZERO SUBSTRING, LGPD CPF, CONFLITO)
// =========================================================================

export function normalizarTexto(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizarPalavras(str) {
  const norm = normalizarTexto(str);
  if (!norm) return [];
  return norm.split(" ").filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

function distanciaLevenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

export function telefoneCombina(senderPhone, contatoDb) {
  const sDig = String(senderPhone || "").replace(/\D/g, "");
  const cDig = String(contatoDb || "").replace(/\D/g, "");
  if (sDig.length < 8 || cDig.length < 8) return { match: false, exato: false };

  const sSemDdi = sDig.length >= 12 && sDig.startsWith("55") ? sDig.slice(2) : sDig;
  const cSemDdi = cDig.length >= 12 && cDig.startsWith("55") ? cDig.slice(2) : cDig;

  const sLast8 = sSemDdi.slice(-8);
  const cLast8 = cSemDdi.slice(-8);
  if (sLast8 !== cLast8) return { match: false, exato: false };

  // Verifica DDD quando ambos possuem DDD (10 ou 11 dígitos)
  const sDdd = sSemDdi.length >= 10 ? sSemDdi.slice(0, 2) : "";
  const cDdd = cSemDdi.length >= 10 ? cSemDdi.slice(0, 2) : "";
  if (sDdd && cDdd && sDdd !== cDdd) {
    return { match: false, exato: false };
  }

  return { match: true, exato: Boolean(sDdd && cDdd && sDdd === cDdd) };
}

export function cpfCombinaComMascara(cpfComprovante, cpfDb) {
  const dbDig = String(cpfDb || "").replace(/\D/g, "");
  if (dbDig.length !== 11) return { match: false, tipo: null };

  const raw = String(cpfComprovante || "").trim();
  const compDig = raw.replace(/\D/g, "");
  if (compDig.length < 5) return { match: false, tipo: null };

  // 1. CPF completo (11 dígitos)
  if (compDig.length === 11) {
    return compDig === dbDig
      ? { match: true, tipo: "completo" }
      : { match: false, tipo: null };
  }

  // 2. CPF mascarado preservando posição (ex: ***.066.527-**, •••.066.527-••, 091.***.***-35, XXX.066.527-XX)
  const mascaraLimpa = raw.replace(/[.\-\s/]/g, "");
  if (mascaraLimpa.length === 11 && /[*•xX]/.test(mascaraLimpa)) {
    const regexStr = "^" + mascaraLimpa.replace(/[*•xX]/g, "\\d").replace(/[^\d\\d]/g, "") + "$";
    try {
      if (new RegExp(regexStr).test(dbDig)) {
        return { match: true, tipo: "mascarado_posicional" };
      }
    } catch {
      // ignora regex inválida
    }
  }

  // 3. Padrão LGPD mais comum no Brasil: 6 dígitos do meio (posições 3..9)
  if (compDig.length === 6 && dbDig.slice(3, 9) === compDig) {
    return { match: true, tipo: "mascarado_meio6" };
  }

  // 4. Fallback: 6+ dígitos contíguos dentro do CPF
  if (compDig.length >= 6 && dbDig.includes(compDig)) {
    return { match: true, tipo: "parcial" };
  }

  return { match: false, tipo: null };
}

export function vincularFormandoComSeguranca({
  todosFormandos,
  senderPhone,
  pushName,
  ocr,
  textoMensagem,
  nomeArquivo,
  contextoRecente
}) {
  const lista = Array.isArray(todosFormandos) ? todosFormandos : [];
  if (lista.length === 0) {
    return {
      formando: null,
      confianca: "SEM_VINCULO",
      motivo: "Lista de formandos vazia.",
      matchTelefone: false,
      candidatos: []
    };
  }

  // 1. Pré-calcula frequência de cada token nos 48 formandos (para distinguir nomes/sobrenomes únicos vs repetidos!)
  const freqNomeAluno = new Map();
  const freqPrimeiroNomeAluno = new Map();
  const freqTodosTokens = new Map();
  const todosPrimeirosNomes = new Set();

  const perfis = lista.map(f => {
    const nomeTokens = tokenizarPalavras(f.nome);
    const primeiroNome = nomeTokens[0] || "";
    const sobrenomesAluno = nomeTokens.slice(1);
    const respPartes = String(f.responsavel || "")
      .split("/")
      .map(p => p.trim())
      .filter(Boolean);
    const respTokensPorParte = respPartes.map(p => tokenizarPalavras(p));
    const respTodosTokens = Array.from(new Set(respTokensPorParte.flat()));
    const familiaTokens = Array.from(new Set([...nomeTokens, ...respTodosTokens]));

    if (primeiroNome) {
      todosPrimeirosNomes.add(primeiroNome);
      freqPrimeiroNomeAluno.set(primeiroNome, (freqPrimeiroNomeAluno.get(primeiroNome) || 0) + 1);
    }
    for (const t of new Set(nomeTokens)) {
      freqNomeAluno.set(t, (freqNomeAluno.get(t) || 0) + 1);
    }
    for (const t of familiaTokens) {
      freqTodosTokens.set(t, (freqTodosTokens.get(t) || 0) + 1);
    }

    return {
      f,
      nomeTokens,
      primeiroNome,
      sobrenomesAluno,
      respPartes,
      respTokensPorParte,
      respTodosTokens,
      familiaTokens
    };
  });

  // Tokens de texto explícito (legenda, descrição do Pix, aluno citado, contexto recente, nome do arquivo)
  const textoExplicitoBruto = [
    ocr?.nome_aluno_mencionado || "",
    textoMensagem || "",
    ocr?.descricao_ou_mensagem || "",
    contextoRecente || "",
    String(nomeArquivo || "").replace(/[_-]+/g, " ")
  ].join(" ");

  const tokensExplicito = new Set(tokenizarPalavras(textoExplicitoBruto));
  const pagadorTokensLista = tokenizarPalavras(ocr?.nome_pagador || "");
  const tokensPagador = new Set(pagadorTokensLista);
  const sobrenomesPagador = new Set(pagadorTokensLista.slice(1)); // Exclui o 1º nome do pagador para match de sobrenome de família
  const tokensPush = new Set(tokenizarPalavras(pushName || ""));

  // Helper de match de palavra inteira (com tolerância de 1 typo APENAS em palavras >= 5 chars que não colidem com outro nome!)
  const temToken = (conjunto, alvo) => {
    if (conjunto.has(alvo)) return true;
    if (alvo.length >= 5) {
      for (const t of conjunto) {
        if (t.length >= 5 && Math.abs(t.length - alvo.length) <= 1) {
          // Evita confundir nomes diferentes como lucas/lukas, gabriel/gabriela, rafael/rafaela, marco/marcos, luiz/luiza
          if (todosPrimeirosNomes.has(t) && t !== alvo) continue;
          if (distanciaLevenshtein(t, alvo) === 1) {
            // Não permite diferença apenas de gênero no último caractere (gabriel vs gabriela, daniel vs daniela)
            if (t.startsWith(alvo) || alvo.startsWith(t)) continue;
            return true;
          }
        }
      }
    }
    return false;
  };

  // Conta quantos formandos batem por telefone e por CPF (para detectar duplicidades)
  const matchesTelefoneIds = new Set();
  const matchesCpfIds = new Set();
  for (const p of perfis) {
    if (senderPhone && telefoneCombina(senderPhone, p.f.contato).match) {
      matchesTelefoneIds.add(p.f.id);
    }
    if (ocr?.cpf_pagador && cpfCombinaComMascara(ocr.cpf_pagador, p.f.cpf).match) {
      matchesCpfIds.add(p.f.id);
    }
  }

  // Pontuação por formando
  const avaliados = perfis.map(p => {
    let score = 0;
    let scoreTelefone = 0;
    let scoreCpf = 0;
    let scoreAlunoExplicito = 0;
    let scorePagador = 0;
    let scoreGemini = 0;
    const evidencias = [];

    // --- SINAL 1: TELEFONE CADASTRADO ---
    if (matchesTelefoneIds.has(p.f.id)) {
      const unico = matchesTelefoneIds.size === 1;
      scoreTelefone = unico ? 95 : 50;
      score += scoreTelefone;
      evidencias.push(unico ? "telefone WhatsApp cadastrado" : "telefone compartilhado por mais de 1 formando");
    }

    // --- SINAL 2: CPF DO PAGADOR (EXATO OU MASCARADO LGPD) ---
    if (matchesCpfIds.has(p.f.id)) {
      const cpfRes = cpfCombinaComMascara(ocr.cpf_pagador, p.f.cpf);
      const unico = matchesCpfIds.size === 1;
      if (cpfRes.tipo === "completo") {
        scoreCpf = unico ? 130 : 60;
      } else {
        scoreCpf = unico ? 110 : 50;
      }
      score += scoreCpf;
      evidencias.push(`CPF do pagador compatível (${cpfRes.tipo})`);
    }

    // --- SINAL 3: MENÇÃO EXPLÍCITA DO NOME DO ALUNO NA CONVERSA / DESCRIÇÃO PIX / ARQUIVO ---
    const tokensAlunoBatidos = p.nomeTokens.filter(t => temToken(tokensExplicito, t));
    const bateuPrimeiroAluno = p.primeiroNome ? temToken(tokensExplicito, p.primeiroNome) : false;
    const sobrenomesAlunoBatidos = p.sobrenomesAluno.filter(t => temToken(tokensExplicito, t));
    const sobrenomesUnicosAluno = sobrenomesAlunoBatidos.filter(
      t => (freqTodosTokens.get(t) || 0) === 1 && !SOBRENOMES_MUITO_COMUNS.has(t)
    );

    // Quantos formandos compartilham EXATAMENTE o conjunto de tokens que bateu?
    const qtdFormandosMesmosTokens = tokensAlunoBatidos.length > 0
      ? perfis.filter(outro => tokensAlunoBatidos.every(tok => outro.nomeTokens.includes(tok))).length
      : 0;
    const coberturaNome = p.nomeTokens.length > 0 ? tokensAlunoBatidos.length / p.nomeTokens.length : 0;

    if (bateuPrimeiroAluno && tokensAlunoBatidos.length >= 2 && qtdFormandosMesmosTokens === 1) {
      if (coberturaNome >= 0.99) {
        scoreAlunoExplicito = 130;
        evidencias.push(`nome completo exato do aluno citado (${tokensAlunoBatidos.join(" ")})`);
      } else if (sobrenomesUnicosAluno.length >= 1 || sobrenomesAlunoBatidos.length >= 2) {
        scoreAlunoExplicito = 120;
        evidencias.push(`nome identificador único do aluno (${tokensAlunoBatidos.join(" ")})`);
      } else {
        scoreAlunoExplicito = 110;
        evidencias.push(`nome + sobrenome único do aluno (${tokensAlunoBatidos.join(" ")})`);
      }
    } else if (bateuPrimeiroAluno && tokensAlunoBatidos.length >= 2 && qtdFormandosMesmosTokens > 1) {
      // Ex: "Ana Clara" (3 alunos) ou "Ana Clara Carvalho" (2 alunos: #3 e #4) -> ambíguo!
      scoreAlunoExplicito = 35;
      evidencias.push(`nome compartilhado por ${qtdFormandosMesmosTokens} alunos (${tokensAlunoBatidos.join(" ")})`);
    } else if (bateuPrimeiroAluno) {
      const freqPrimeiro = freqPrimeiroNomeAluno.get(p.primeiroNome) || 0;
      if (freqPrimeiro === 1 && p.primeiroNome.length >= 4 && !["ana", "maria", "joao", "luiz"].includes(p.primeiroNome)) {
        scoreAlunoExplicito = 82;
        evidencias.push(`primeiro nome exclusivo do aluno (${p.primeiroNome})`);
      } else {
        scoreAlunoExplicito = 25;
        evidencias.push(`primeiro nome não exclusivo (${p.primeiroNome})`);
      }
    } else if (sobrenomesUnicosAluno.length >= 1) {
      scoreAlunoExplicito = 65;
      evidencias.push(`sobrenome exclusivo do aluno citado (${sobrenomesUnicosAluno[0]})`);
    }
    score += scoreAlunoExplicito;

    // --- SINAL 4: NOME DO PAGADOR NO COMPROVANTE (VS RESPONSÁVEL, ALUNO E SOBRENOMES DE FAMÍLIA) ---
    if (tokensPagador.size > 0) {
      let melhorRespScore = 0;
      let melhorRespDesc = "";

      for (const parteTokens of p.respTokensPorParte) {
        if (parteTokens.length === 0) continue;
        const batidos = parteTokens.filter(t => temToken(tokensPagador, t));
        const bateuPrimeiroResp = temToken(tokensPagador, parteTokens[0]);
        const ratio = batidos.length / parteTokens.length;

        if (bateuPrimeiroResp && (batidos.length >= 2 || (parteTokens.length === 1 && (freqTodosTokens.get(parteTokens[0]) || 0) === 1))) {
          const s = ratio >= 0.65 ? 110 : 95;
          if (s > melhorRespScore) {
            melhorRespScore = s;
            melhorRespDesc = `pagador coincide com responsável (${batidos.join(" ")})`;
          }
        }
      }

      // E se o próprio ALUNO pagou (ex: conta própria do aluno)?
      const batidosAlunoNoPagador = p.nomeTokens.filter(t => temToken(tokensPagador, t));
      if (p.primeiroNome && temToken(tokensPagador, p.primeiroNome) && batidosAlunoNoPagador.length >= 2) {
        if (110 > melhorRespScore) {
          melhorRespScore = 110;
          melhorRespDesc = `pagador é o próprio formando (${batidosAlunoNoPagador.join(" ")})`;
        }
      }

      // E se quem pagou foi o OUTRO PAI / FAMILIAR com o mesmo sobrenome EXCLUSIVO do aluno?
      if (melhorRespScore === 0 && sobrenomesPagador.size > 0) {
        const sobrenomesFamiliaUnicos = p.familiaTokens.filter(
          t =>
            t !== p.primeiroNome &&
            !p.respTokensPorParte.some(pt => pt[0] === t) &&
            !NOMES_PROPRIOS_COMUNS.has(t) &&
            !SOBRENOMES_MUITO_COMUNS.has(t) &&
            (freqTodosTokens.get(t) || 0) === 1 &&
            sobrenomesPagador.has(t)
        );
        if (sobrenomesFamiliaUnicos.length >= 2) {
          melhorRespScore = 85;
          melhorRespDesc = `pagador compartilha sobrenomes exclusivos da família (${sobrenomesFamiliaUnicos.join(" ")})`;
        } else if (sobrenomesFamiliaUnicos.length === 1) {
          melhorRespScore = 58;
          melhorRespDesc = `pagador compartilha sobrenome exclusivo da família (${sobrenomesFamiliaUnicos[0]})`;
        }
      }

      scorePagador = melhorRespScore;
      if (scorePagador > 0) {
        score += scorePagador;
        evidencias.push(melhorRespDesc);
      }
    }

    // --- SINAL 5: NOME DO RESPONSÁVEL CITADO NO TEXTO OU NOME DO ARQUIVO (ex: Boleto-Giuliana...) ---
    if (scorePagador === 0 && tokensExplicito.size > 0) {
      for (const parteTokens of p.respTokensPorParte) {
        if (parteTokens.length < 2) continue;
        const batidos = parteTokens.filter(t => temToken(tokensExplicito, t));
        if (temToken(tokensExplicito, parteTokens[0]) && batidos.length >= 2) {
          score += 80;
          evidencias.push(`responsável citado no texto/arquivo (${batidos.join(" ")})`);
          break;
        }
      }
    }

    // --- SINAL 6: CORROBORAÇÃO LEVE PELO PUSH NAME (apenas sobrenome exclusivo ou 1º nome exclusivo do responsável) ---
    if (tokensPush.size > 0 && score > 0) {
      const bateuPushResp = p.respTodosTokens.some(
        t =>
          (freqTodosTokens.get(t) || 0) === 1 &&
          !SOBRENOMES_MUITO_COMUNS.has(t) &&
          !NOMES_PROPRIOS_COMUNS.has(t) &&
          tokensPush.has(t)
      );
      if (bateuPushResp) {
        score += 12;
        evidencias.push("perfil WhatsApp compatível");
      }
    }

    // --- SINAL 7: CROSS-CHECK COM A SUGESTÃO DO GEMINI ---
    if (ocr?.sugestao_formando_id === p.f.id) {
      if (ocr.sugestao_confianca === "alta") scoreGemini = 25;
      else if (ocr.sugestao_confianca === "media") scoreGemini = 12;
      score += scoreGemini;
      if (scoreGemini > 0) evidencias.push(`corroborado pela IA (${ocr.sugestao_confianca})`);
    }

    return {
      f: p.f,
      score,
      scoreTelefone,
      scoreCpf,
      scoreAlunoExplicito,
      scorePagador,
      scoreGemini,
      evidencias
    };
  });

  avaliados.sort((a, b) => b.score - a.score);
  const top1 = avaliados[0];
  const top2 = avaliados[1];

  const candidatos = avaliados
    .filter(a => a.score >= 25)
    .slice(0, 3)
    .map(a => ({
      id: a.f.id,
      nome: a.f.nome,
      responsavel: a.f.responsavel,
      score: a.score,
      evidencias: a.evidencias
    }));

  if (!top1 || top1.score < 25) {
    return {
      formando: null,
      confianca: "SEM_VINCULO",
      motivo: "Nenhuma correspondência segura encontrada por telefone, CPF, nome do pagador ou legenda.",
      matchTelefone: false,
      candidatos
    };
  }

  // --- DETECÇÃO DE CONFLITO (ex: telefone é da Mãe A, mas legenda/CPF é do Aluno B!) ---
  const candidatoPorTelefone = avaliados.find(a => a.scoreTelefone >= 90);
  const telefoneJaConfirmado = candidatoPorTelefone && (
    candidatoPorTelefone.scoreCpf >= 100 ||
    candidatoPorTelefone.scoreAlunoExplicito >= 80 ||
    candidatoPorTelefone.scorePagador >= 95
  );
  const candidatoPorAlunoOuCpf = avaliados.find(
    a => a.f.id !== candidatoPorTelefone?.f.id && (a.scoreCpf >= 100 || a.scoreAlunoExplicito >= 80)
  );

  if (candidatoPorTelefone && !telefoneJaConfirmado && candidatoPorAlunoOuCpf) {
    // Se CPF + nome explícito apontam juntos para outro aluno (ex: pai mandou pelo celular de terceiro ou teste), prioriza com segurança
    const certezaOutro = candidatoPorAlunoOuCpf.scoreCpf >= 100 && candidatoPorAlunoOuCpf.scoreAlunoExplicito >= 80;
    if (!certezaOutro) {
      return {
        formando: candidatoPorAlunoOuCpf.f,
        confianca: "CONFLITO",
        motivo: `Conflito detectado: telefone cadastrado é de ${candidatoPorTelefone.f.nome}, mas o comprovante/mensagem indica ${candidatoPorAlunoOuCpf.f.nome}. Conferência manual necessária.`,
        matchTelefone: false,
        candidatos
      };
    }
  }

  // --- DETECÇÃO DE DIVERGÊNCIA ENTRE MOTOR DETERMINÍSTICO E IA ---
  if (
    ocr?.sugestao_formando_id &&
    ocr.sugestao_confianca === "alta" &&
    ocr.sugestao_formando_id !== top1.f.id &&
    top1.score < 140
  ) {
    const sugeridoIa = lista.find(x => x.id === ocr.sugestao_formando_id);
    if (sugeridoIa) {
      return {
        formando: top1.f,
        confianca: "CONFLITO",
        motivo: `Divergência entre cruzamento de dados (${top1.f.nome}) e leitura da IA (${sugeridoIa.nome}). Encaminhado para conferência.`,
        matchTelefone: top1.scoreTelefone >= 90,
        candidatos
      };
    }
  }

  // --- DETECÇÃO DE AMBIGUIDADE (MARGEM PEQUENA ENTRE TOP 1 E TOP 2) ---
  const margem = top2 ? top1.score - top2.score : top1.score;
  if (top2 && top2.score >= 25 && margem < 30) {
    return {
      formando: top1.f,
      confianca: "AMBIGUA",
      motivo: `Vínculo ambíguo entre ${top1.f.nome} (${top1.score} pts) e ${top2.f.nome} (${top2.score} pts). Requer escolha manual.`,
      matchTelefone: top1.scoreTelefone >= 90,
      candidatos
    };
  }

  // --- REGRA DE CONFIANÇA ALTA (EXIGE EVIDÊNCIA FORTE E INEQUÍVOCA!) ---
  const temEvidenciaForte =
    top1.scoreCpf >= 100 ||
    top1.scoreTelefone >= 90 ||
    top1.scoreAlunoExplicito >= 105 ||
    top1.scorePagador >= 95 ||
    (top1.scoreAlunoExplicito >= 80 && margem >= 45) ||
    (top1.scorePagador >= 50 && (top1.scoreAlunoExplicito >= 25 || top1.scoreTelefone >= 50));

  if (temEvidenciaForte && top1.score >= 82 && margem >= 30) {
    return {
      formando: top1.f,
      confianca: "ALTA",
      motivo: `Vínculo confirmado (${top1.evidencias.join(" + ")}).`,
      matchTelefone: top1.scoreTelefone >= 90,
      candidatos
    };
  }

  // --- CONFIANÇA MÉDIA OU BAIXA (NUNCA DÁ BAIXA AUTOMÁTICA!) ---
  const nivel = top1.score >= 55 ? "MEDIA" : "BAIXA";
  return {
    formando: top1.f,
    confianca: nivel,
    motivo: `Sugestão com confiança ${nivel.toLowerCase()} (${top1.evidencias.join(" + ")}). Conferir antes de baixar.`,
    matchTelefone: top1.scoreTelefone >= 90,
    candidatos
  };
}

// =========================================================================
// MÓDULO 4: SAUDAÇÃO SEGURA (SEM ERRAR NOME) E FILTRO ANTI-SPAM
// =========================================================================

export function escolherSaudacaoSegura({ formando, matchTelefone, nomePagador, pushName }) {
  if (!formando) return "";

  const respPartes = String(formando.responsavel || "")
    .split("/")
    .map(p => p.trim())
    .filter(Boolean);

  const tokensPagador = new Set(tokenizarPalavras(nomePagador || ""));
  const tokensPush = new Set(tokenizarPalavras(pushName || ""));

  // 1. Se há múltiplos responsáveis ("Guilherme ... / Maria Leda"), só usa o nome se souber QUAL deles está falando!
  if (respPartes.length > 1) {
    for (const parte of respPartes) {
      const primeiro = tokenizarPalavras(parte)[0];
      if (!primeiro) continue;
      if (tokensPush.has(primeiro) || tokensPagador.has(primeiro)) {
        return capitalizarNome(parte.split(/\s+/)[0]);
      }
    }
    // Não sabemos se é o pai ou a mãe na linha -> saudação neutra (melhor que chamar pelo nome errado!)
    return "";
  }

  // 2. Responsável único cadastrado
  const respUnico = respPartes[0] || "";
  const respTokens = tokenizarPalavras(respUnico);
  const primeiroRespNorm = respTokens[0] || "";
  const primeiroRespExibicao = respUnico ? capitalizarNome(respUnico.split(/\s+/)[0]) : "";

  // Se o pagador tem nome diferente do responsável E o telefone NÃO é do responsável, NÃO chama pelo nome do responsável!
  if (!matchTelefone && tokensPagador.size > 0 && primeiroRespNorm && !tokensPagador.has(primeiroRespNorm)) {
    // Se o pushName coincide com o primeiro nome do pagador, podemos saudar o pagador pelo primeiro nome!
    const primeiroPagadorRaw = String(nomePagador || "").trim().split(/\s+/)[0] || "";
    const primeiroPagadorNorm = normalizarTexto(primeiroPagadorRaw);
    if (primeiroPagadorNorm.length >= 3 && tokensPush.has(primeiroPagadorNorm)) {
      return capitalizarNome(primeiroPagadorRaw);
    }
    return "";
  }

  // Se o telefone é do responsável OU o pagador coincide com o responsável -> pode usar o primeiro nome com segurança!
  if (matchTelefone || (primeiroRespNorm && tokensPagador.has(primeiroRespNorm))) {
    // Evita errar quando a esposa/marido usa o celular mas o pushName claramente é outra pessoa
    if (tokensPush.size > 0 && primeiroRespNorm && !tokensPush.has(primeiroRespNorm)) {
      // Ex: pushName "Gil Albuquerque" para "Giuliana" (apelido) — se não há conflito óbvio, saudação neutra é super elegante e zero risco!
      const apelidoCompativel = Array.from(tokensPush).some(
        tp => tp.length >= 3 && (primeiroRespNorm.startsWith(tp) || tp.startsWith(primeiroRespNorm))
      );
      if (!apelidoCompativel && !tokensPagador.has(primeiroRespNorm)) {
        return "";
      }
    }
    return primeiroRespExibicao;
  }

  return "";
}

export function ehSaudacaoIsolada(texto) {
  const bruto = String(texto || "").trim();
  if (!bruto || bruto.length > 36) return false;
  if (bruto.includes("?")) return false;

  const norm = normalizarTexto(bruto);
  if (!norm) return false;

  // Bloqueia qualquer mensagem com assunto real/pergunta financeira ou do evento
  const palavrasProibidas = [
    "falta", "pagar", "valor", "boleto", "pix", "convite", "parcela", "tudo certo",
    "comprovante", "contrato", "ensaio", "roupa", "foto", "confirmar", "duvida",
    "quanto", "quitar", "quitacao", "restante", "segue", "paguei", "enviei", "mandei"
  ];
  for (const p of palavrasProibidas) {
    if (norm.includes(p)) return false;
  }

  return /^(oi+|oie+|ola+|opa+|bom dia+|boa tarde+|boa noite+|hello+|hi+)(\s+(pessoal|equipe|celebra|gente|tudo bem|td bem))?$/.test(norm);
}

function montarMensagemConfirmacaoBaixa({ saudacaoNome, formando, valor, pagadorNome, novoFalta }) {
  const cumprimento = saudacaoNome ? `Olá, *${saudacaoNome}*!` : "Olá!";
  const valorFmt = formatarBRL(valor);
  const dias = calcularDiasParaFormatura();
  const linhaContagem = dias > 1
    ? `\n⏳ *Reta Final:* Faltam apenas *${dias} dias* para o grande baile no Guerrah Hall!`
    : (dias === 1 ? `\n⏳ *É AMANHÃ!* Chegou o grande dia do baile no Guerrah Hall!` : "");
  const linhaPagador = pagadorNome ? `\n👤 *Pagador identificado:* ${pagadorNome}` : "";

  if (novoFalta <= 0.01) {
    return `${cumprimento} 🎓✨\n\nConfirmamos o recebimento do comprovante no valor de *R$ ${valorFmt}* referente à formatura de *${formando.nome}*!${linhaPagador}\n\n🎉 *PARABÉNS! Formatura 100% QUITADA no sistema!* 🎉\n✅ *Status:* Todas as parcelas pagas com sucesso.${linhaContagem}\n\nAgradecemos a parceria! Nossa equipe financeira está à disposição. 💼✨`;
  }

  return `${cumprimento} 🎓✨\n\nConfirmamos o recebimento do comprovante no valor de *R$ ${valorFmt}* referente à formatura de *${formando.nome}*!${linhaPagador}\n\n✅ *Status:* Pagamento registrado e parcela baixada com sucesso no sistema.\n💰 *Saldo restante:* R$ ${formatarBRL(novoFalta)}${linhaContagem}\n\nAgradecemos a pontualidade! Qualquer dúvida, nossa equipe financeira está à disposição. 💼🎉`;
}

// =========================================================================
// MÓDULO 5: UTILITÁRIOS FINANCEIROS E FORMATAÇÃO
// =========================================================================

export function parseValorMonetario(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") {
    return Number.isFinite(val) && val > 0 ? Math.round(val * 100) / 100 : null;
  }
  let s = String(val).replace(/[^\d.,]/g, "").trim();
  if (!s) return null;
  // Formato brasileiro "1.720,00" ou "430,00"
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const num = parseFloat(s);
  return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : null;
}

export function formatarBRL(valor) {
  const num = Number(valor) || 0;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcularDiasParaFormatura() {
  try {
    const agoraSp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hoje = new Date(agoraSp.getFullYear(), agoraSp.getMonth(), agoraSp.getDate());
    const [ano, mes, dia] = DATA_FORMATURA_ISO.split("-").map(Number);
    const evento = new Date(ano, mes - 1, dia);
    return Math.round((evento - hoje) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

function capitalizarNome(str) {
  const s = String(str || "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function limparPushName(name) {
  const s = String(name || "").trim();
  if (!s || /^\d+$/.test(s) || s.toLowerCase() === "você" || s.toLowerCase() === "voce") return "";
  return s;
}

function detectarConviteExtraTexto(txt) {
  const norm = normalizarTexto(txt);
  return /\b(convite|convites|mesa\s+extra|extras?)\b/.test(norm);
}

function extrairQtdConvites(txt) {
  const match = normalizarTexto(txt).match(/\b(\d{1,2})\s*(convites?|extras?)\b/);
  return match ? parseInt(match[1], 10) : null;
}

function formatarComprovanteParaPainel(c, formandosMap) {
  const f = c.formando_id ? formandosMap.get(c.formando_id) : null;
  const valor = parseFloat(c.valor) || 0;
  const dt = c.created_at ? new Date(c.created_at) : new Date();
  const horaFmt = dt.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(", ", " • ");

  let tipoBadge = "Pix Confirmado";
  if (c.eh_convite_extra || c.status_conferencia === "convite_extra") {
    tipoBadge = "Convite Extra";
  } else if (c.tipo_documento === "erro_leitura") {
    tipoBadge = "⚠️ Erro Leitura";
  } else if (c.tipo_documento === "agendamento") {
    tipoBadge = "⏳ Agendamento";
  } else if (c.tipo_documento === "comprovante_boleto") {
    tipoBadge = "Boleto Pago";
  } else if (f && valor > 0 && (parseFloat(f.valor_falta) || 0) - valor <= 0.01) {
    tipoBadge = "✨ Quitação Final";
  }

  let confiancaLabel = "⚠️ Requer Conferência";
  if (c.confianca_vinculo === "ALTA" && c.status_conferencia === "aprovado_auto") {
    confiancaLabel = "100% IA";
  } else if (c.confianca_vinculo === "ALTA") {
    confiancaLabel = "Alta Confiança";
  } else if (c.confianca_vinculo === "CONFLITO") {
    confiancaLabel = "⚠️ Conflito de Vínculo";
  } else if (c.confianca_vinculo === "AMBIGUA") {
    confiancaLabel = "⚠️ Nome Ambíguo";
  }

  const faltaAntes = f ? (parseFloat(f.valor_falta) || 0) : null;
  const pagoAntes = f ? (parseFloat(f.valor_pago) || 0) : null;
  const faltaDepois = faltaAntes !== null ? Math.max(0, faltaAntes - valor) : null;

  return {
    id: c.id,
    isReal: true,
    valor,
    pagador: c.pagador_nome || c.remetente_push_name || "Pagador não identificado",
    cpf: c.pagador_cpf || "Não informado",
    banco: c.banco_pagador || (c.mime_type === "application/pdf" ? "Documento PDF" : "Imagem WhatsApp"),
    hora: horaFmt,
    formandoId: c.formando_id || null,
    formandoNome: c.formando_nome || "⚠️ Sem vínculo — selecionar formando",
    responsavel: c.responsavel_nome || "Não vinculado",
    destino: c.eh_convite_extra
      ? `Convites Extras${c.qtd_convites_extras ? ` (${c.qtd_convites_extras} un.)` : ""}`
      : (c.tipo_documento === "comprovante_boleto" ? "Pagamento de Boleto" : "Parcela Formatura"),
    confianca: confiancaLabel,
    confiancaVinculo: c.confianca_vinculo,
    motivoVinculo: c.motivo_vinculo || "",
    candidatos: Array.isArray(c.candidatos_json) ? c.candidatos_json : [],
    tipoBadge,
    tipoDocumento: c.tipo_documento,
    statusConferencia: c.status_conferencia,
    baixadoNoSaldo: Boolean(c.baixado_no_saldo),
    textoMsg: c.mensagem_texto || c.descricao_pix || "(enviado sem legenda)",
    statusAntes: f
      ? `R$ ${formatarBRL(pagoAntes)} pagos (Faltam R$ ${formatarBRL(faltaAntes)})`
      : "Vínculo pendente de seleção pela equipe",
    statusDepois: c.eh_convite_extra
      ? "⚠️ Registrar Convites Extras (não altera contrato)"
      : (f && valor > 0
        ? (faltaDepois <= 0.01
          ? `🎉 100% QUITADO! (Total R$ ${formatarBRL(f.valor_total)})`
          : `Total pago sobe para R$ ${formatarBRL(pagoAntes + valor)} (Faltará R$ ${formatarBRL(faltaDepois)})`)
        : "⚠️ Conferir valor e selecionar o formando correto"),
    detalhes: [
      c.favorecido_nome ? `Favorecido: ${c.favorecido_nome}` : null,
      c.chave_pix_destino ? `Chave: ${c.chave_pix_destino}` : null,
      c.id_transacao ? `ID: ${c.id_transacao}` : null,
      c.nome_arquivo ? `Arquivo: ${c.nome_arquivo}` : null
    ].filter(Boolean).join(" • ") || "Recebido via WhatsApp oficial"
  };
}

// =========================================================================
// MÓDULO 6: SUPABASE & EVOLUTION API
// =========================================================================

function headersSupabase(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    ...extra
  };
}

async function buscarTodosFormandosSupabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/formandos?select=*&order=id.asc`, {
      headers: headersSupabase()
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Erro buscarTodosFormandosSupabase:", e);
    return [];
  }
}

async function buscarFormandoPorId(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/formandos?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {
      headers: headersSupabase()
    });
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (e) {
    console.error("Erro buscarFormandoPorId:", e);
    return null;
  }
}

async function atualizarPagamentoSupabase(formando, valorPago) {
  const pagoAtual = parseFloat(formando.valor_pago) || 0;
  const total = parseFloat(formando.valor_total) || 3990;
  const novoPago = Math.round((pagoAtual + valorPago) * 100) / 100;
  const novoFalta = Math.max(0, Math.round((total - novoPago) * 100) / 100);
  const novoStatus = novoFalta <= 0.01 ? "quitado" : "em_andamento";

  const res = await fetch(`${SUPABASE_URL}/rest/v1/formandos?id=eq.${formando.id}`, {
    method: "PATCH",
    headers: headersSupabase({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({
      valor_pago: novoPago,
      valor_falta: novoFalta,
      status: novoStatus
    })
  });

  if (!res.ok) {
    console.error("Erro PATCH formandos:", res.status, await res.text());
  }

  return { novoPago, novoFalta, novoStatus };
}

async function buscarComprovantesSupabase(includeAll = false) {
  try {
    const filtro = includeAll
      ? "status_conferencia=neq.ignorado"
      : "status_conferencia=in.(pendente_conferencia,convite_extra,duvida,erro_leitura)";
    const res = await fetch(`${SUPABASE_URL}/rest/v1/comprovantes?${filtro}&order=created_at.desc&limit=50`, {
      headers: headersSupabase()
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Erro buscarComprovantesSupabase:", e);
    return [];
  }
}

async function buscarComprovantePorId(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/comprovantes?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {
      headers: headersSupabase()
    });
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

async function buscarComprovantePorMessageId(messageId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/comprovantes?whatsapp_message_id=eq.${encodeURIComponent(messageId)}&select=id&limit=1`,
      { headers: headersSupabase() }
    );
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

async function buscarComprovantePorTransacao(idTransacao) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/comprovantes?id_transacao=eq.${encodeURIComponent(idTransacao)}&status_conferencia=in.(aprovado_auto,aprovado_manual,pendente_conferencia,convite_extra)&select=id,valor,status_conferencia&limit=1`,
      { headers: headersSupabase() }
    );
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

async function salvarComprovanteSupabase(payload) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/comprovantes`, {
      method: "POST",
      headers: headersSupabase({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error("Erro INSERT comprovantes:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  } catch (e) {
    console.error("Exceção INSERT comprovantes:", e);
    return null;
  }
}

async function atualizarComprovanteSupabase(id, patch) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/comprovantes?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: headersSupabase({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      console.error("Erro PATCH comprovantes:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Exceção PATCH comprovantes:", e);
  }
}

async function registrarInteracaoSupabase(remetenteJid, remetenteTelefone, tipo, conteudo) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_interacoes`, {
      method: "POST",
      headers: headersSupabase({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({
        remetente_jid: remetenteJid,
        remetente_telefone: remetenteTelefone || null,
        tipo,
        conteudo: String(conteudo || "").slice(0, 500)
      })
    });
  } catch (e) {
    console.warn("Aviso ao registrar interação:", e.message);
  }
}

async function verificarCooldownSaudacao(targetRecipient, rawRemoteJid) {
  try {
    const limiteIso = new Date(Date.now() - SAUDACAO_COOLDOWN_HORAS * 60 * 60 * 1000).toISOString();
    const jids = Array.from(new Set([targetRecipient, rawRemoteJid].filter(Boolean)));
    const filtroJid = jids.map(j => `remetente_jid.eq.${encodeURIComponent(j)}`).join(",");

    // 1. Verifica tabela whatsapp_interacoes (saudações ou comprovantes recentes)
    const resDb = await fetch(
      `${SUPABASE_URL}/rest/v1/whatsapp_interacoes?or=(${filtroJid})&tipo=in.(saudacao_enviada,comprovante)&created_at=gte.${encodeURIComponent(limiteIso)}&select=id&limit=1`,
      { headers: headersSupabase() }
    );
    const rows = await resDb.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0) return true;

    // 2. Verifica na Evolution API se a equipe/robô já respondeu nesta conversa nas últimas 12h
    const msgsRecentes = await buscarMensagensRecentesEvolution(targetRecipient, rawRemoteJid, 10);
    const limiteSec = Math.floor(Date.now() / 1000) - SAUDACAO_COOLDOWN_HORAS * 3600;
    const jaHouveResposta = msgsRecentes.some(m => m.key?.fromMe && (m.messageTimestamp || 0) >= limiteSec);
    return jaHouveResposta;
  } catch {
    return false;
  }
}

async function obterContextoRecenteRemetente(targetRecipient, rawRemoteJid, currentMessageId) {
  const textos = [];
  const dezMinAtrasIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const dezMinAtrasSec = Math.floor(Date.now() / 1000) - 600;

  // 1. Busca textos recentes salvos no Supabase
  try {
    const jids = Array.from(new Set([targetRecipient, rawRemoteJid].filter(Boolean)));
    const filtroJid = jids.map(j => `remetente_jid.eq.${encodeURIComponent(j)}`).join(",");
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/whatsapp_interacoes?or=(${filtroJid})&tipo=eq.mensagem_texto&created_at=gte.${encodeURIComponent(dezMinAtrasIso)}&order=created_at.desc&limit=5`,
      { headers: headersSupabase() }
    );
    const rows = await res.json().catch(() => []);
    if (Array.isArray(rows)) {
      for (const r of rows.reverse()) {
        if (r.conteudo) textos.push(r.conteudo);
      }
    }
  } catch {
    // continua com fallback da Evolution
  }

  // 2. Complementa com histórico da Evolution API (últimos 10 min)
  if (textos.length === 0) {
    try {
      const msgs = await buscarMensagensRecentesEvolution(targetRecipient, rawRemoteJid, 8);
      for (const m of msgs.reverse()) {
        if (m.key?.fromMe) continue;
        if (currentMessageId && m.key?.id === currentMessageId) continue;
        if ((m.messageTimestamp || 0) < dezMinAtrasSec) continue;
        const t = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
        if (t.trim()) textos.push(t.trim());
      }
    } catch {
      // ignora erro de rede
    }
  }

  return Array.from(new Set(textos)).join(" | ").slice(0, 400);
}

async function buscarMensagensRecentesEvolution(targetRecipient, rawRemoteJid, limit = 8) {
  try {
    const jidBusca = rawRemoteJid || targetRecipient;
    const res = await fetch(`${EVOLUTION_URL}/chat/findMessages/${INSTANCE_NAME}`, {
      method: "POST",
      headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        where: { key: { remoteJid: jidBusca } },
        limit
      })
    });
    const j = await res.json().catch(() => ({}));
    return j?.messages?.records || j?.records || [];
  } catch {
    return [];
  }
}

async function buscarBase64Evolution(key, messageObj) {
  try {
    const res = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
      method: "POST",
      headers: { apikey: EVOLUTION_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { key, message: messageObj },
        convertToMp4: false
      })
    });
    const json = await res.json().catch(() => ({}));
    return json.base64 || "";
  } catch (e) {
    console.warn("Erro ao buscar base64 via Evolution API:", e.message);
    return "";
  }
}

async function enviarWhatsApp(recipient, texto) {
  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: "POST",
      headers: {
        apikey: EVOLUTION_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        number: recipient,
        text: texto,
        delay: 1200
      })
    });
    if (!res.ok) {
      console.error("Erro HTTP envio WhatsApp:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Erro envio WhatsApp:", e);
  }
}
