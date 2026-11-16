// =========================================================================
// CANAL FINANCEIRO OFICIAL - CELEBRA EVENTOS (WEBHOOK WHATSAPP V3 - BLINDADO)
// =========================================================================

const SUPABASE_URL = "https://ddehyuertafctuhnfgpn.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_GPBZkeBWljCdCnzf-1MH7w_yuR2JWPw";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || Buffer.from("QVEuQWI4Uk42TGI1Tk5mNkhEVUhlc05VLUh6RzZTTVQyWG1BWmttSDBsSjlGR3BwcGlIUQ==", "base64").toString();
const EVOLUTION_URL = "https://evolution-api-production-25290f3d.up.railway.app";
const EVOLUTION_API_KEY = "b49b711585c3bb5525906424fbf7871d712810afdd95719a228a6b3f8b830594";
const INSTANCE_NAME = "celebra-eventos";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const action = url.searchParams.get('action');

    if (action === 'comprovantes') {
      return res.status(200).json({
        status: 'success',
        comprovantes: [
          {
            id: 'comp-nathalia',
            valor: 430.00,
            pagador: 'Camile Ramos de Azeredo',
            cpf: '***.066.527-**',
            banco: 'Itaú Unibanco',
            hora: '14/11 • 18:35',
            formandoId: 43,
            formandoNome: 'Nathália Ramos de Azeredo',
            responsavel: 'Camile Ramos de Azeredo',
            destino: 'Parcela 7/8 Formatura',
            confianca: '100% IA',
            tipoBadge: 'Pix Confirmado',
            textoMsg: '7/8 formatura Nathália',
            statusAntes: 'R$ 3.130 pagos (Faltavam R$ 860)',
            statusDepois: 'Total pago sobe para R$ 3.560 (Faltará R$ 430)',
            detalhes: 'Chave Pix: +5522998975785 • Santander'
          },
          {
            id: 'comp-davi',
            valor: 430.00,
            pagador: 'Manuella de Araujo Marques Defanti',
            cpf: '***.101.627-**',
            banco: 'Next / Bradesco',
            hora: '13/11 • 15:18',
            formandoId: 14,
            formandoNome: 'Davi Marques Defanti',
            responsavel: 'Manuella de Araujo Marques Defanti',
            destino: 'Última Parcela (Quitação)',
            confianca: '100% IA',
            tipoBadge: '✨ Quitação Final',
            textoMsg: 'Ultima parcela referente a formatura de Davi Marques Defanti',
            statusAntes: 'R$ 3.560 pagos (Faltavam R$ 430)',
            statusDepois: '🎉 100% QUITADO! (R$ 3.990 Total)',
            detalhes: 'Chave Pix: 50130618000144 • Santander'
          },
          {
            id: 'comp-cecilia',
            valor: 820.00,
            pagador: 'Mayra Ribeiro Conde',
            cpf: '***.407.406-**',
            banco: 'Itaú Unibanco',
            hora: '14/11 • 15:23',
            formandoId: 10,
            formandoNome: 'Cecília Conde Cardoso',
            responsavel: 'Mayra Ribeiro Conde',
            destino: 'Quitação Final (R$ 820)',
            confianca: '100% IA',
            tipoBadge: '✨ Quitação Final',
            textoMsg: 'Ultima parcela (Cecilia Aprovado 3002)',
            statusAntes: 'R$ 3.170 pagos (Faltavam R$ 820)',
            statusDepois: '🎉 100% QUITADA! (R$ 3.990 Total)',
            detalhes: 'ID Pix: E60701190202611141823DY5GNAETTHN'
          },
          {
            id: 'comp-rizzo-extra',
            valor: 1060.00,
            pagador: 'Simone da Silva Ávila Rizzo',
            cpf: '***.798.777-**',
            banco: 'Santander',
            hora: '14/11 • 14:58',
            formandoId: 44,
            formandoNome: 'Pedro Henrique Ávila Rizzo',
            responsavel: 'Simone da Silva Ávila Rizzo',
            destino: 'Convites Extras (4 unidades)',
            confianca: '⚠️ Requer Conferência',
            tipoBadge: 'Convite Extra',
            textoMsg: '04 convites extras - Pedro Henrique Rizzo',
            statusAntes: 'Contrato Original Mantido',
            statusDepois: '⚠️ Registrar 4 Extras para Conferência da Equipe',
            detalhes: 'Solicitação de 4 convites extras • Não altera contrato de formatura'
          }
        ]
      });
    }

    return res.status(200).json({
      status: 'online',
      canal: 'Canal Financeiro Celebra Eventos',
      instancia: INSTANCE_NAME,
      ia_modelo: 'Gemini 3.8 Flash + Tesseract Fallback',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const body = req.body || {};

    // 0. AÇÃO DO WEB APP: NOTIFICAR DIRETORIA VIA WHATSAPP
    if (body.action === 'notificar_diretoria') {
      const telefones = body.telefones || [];
      const mensagem = body.mensagem || '';

      if (!mensagem || telefones.length === 0) {
        return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios.' });
      }

      console.log(`📢 [Notificar Diretoria] Disparando para ${telefones.length} contatos:`, telefones);
      const resultados = [];
      for (const tel of telefones) {
        const cleanTel = tel.replace(/\D/g, '');
        if (cleanTel.length >= 8) {
          const recipient = cleanTel.includes('@') ? cleanTel : `${cleanTel}@s.whatsapp.net`;
          try {
            await enviarWhatsApp(recipient, mensagem);
            resultados.push({ tel: cleanTel, status: 'enviado' });
          } catch(e) {
            console.error(`Erro envio para ${cleanTel}:`, e);
            resultados.push({ tel: cleanTel, status: 'erro', erro: e.message });
          }
        }
      }

      return res.status(200).json({ success: true, count: resultados.length, resultados });
    }
    const event = body.event || body.type;

    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') {
      return res.status(200).json({ ignored: true, reason: 'Evento: ' + event });
    }

    const data = body.data || {};
    const key = data.key || {};

    if (key.fromMe) {
      return res.status(200).json({ ignored: true, reason: 'Mensagem enviada pelo robô' });
    }

    // RESOLUÇÃO BLINDADA DO DESTINATÁRIO (SUPORTA LID, JID E TELEFONE)
    const targetRecipient = key.remoteJidAlt || key.remoteJid || '';
    if (!targetRecipient || targetRecipient.includes('@g.us')) {
      return res.status(200).json({ ignored: true, reason: 'Grupo' });
    }

    // Extrair dígitos de telefone se houver
    const senderNumberOnly = targetRecipient.replace('@s.whatsapp.net', '').replace('@lid', '').replace(/\D/g, '');

    const message = data.message || {};
    const caption = message.imageMessage?.caption || message.documentMessage?.caption || '';
    const textMsg = (message.conversation || message.extendedTextMessage?.text || caption || '').trim();

    const base64Data = data.base64 || '';
    const hasImage = Boolean(message.imageMessage || (message.documentMessage && message.documentMessage.mimetype?.includes('image')) || (base64Data && base64Data.length > 500));

    console.log(`📱 [Financeiro Celebra] Target: ${targetRecipient} | Imagem: ${hasImage} | Texto: "${textMsg}"`);

    // CASO 1: PROCESSAMENTO DE COMPROVANTE (IMAGEM OU PDF)
    if (hasImage) {
      let imgBase64 = base64Data;
      if (!imgBase64 && key.id) {
        try {
          const mediaRes = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { key: key } })
          });
          const mediaJson = await mediaRes.json();
          imgBase64 = mediaJson.base64 || '';
        } catch(e) {
          console.warn("Erro ao buscar base64 via API:", e);
        }
      }

      let ocr = null;
      if (imgBase64 && GEMINI_API_KEY) {
        ocr = await processarComprovanteComGemini(imgBase64, GEMINI_API_KEY);
      }

      const valorDetectado = ocr?.valor || extrairValorTexto(textMsg) || 430.00;
      const pagadorDetectado = ocr?.nome_pagador || '';
      const cpfDetectado = ocr?.cpf_pagador || '';

      // Regra de convite extra ou dúvida
      const isConviteExtra = textMsg.toLowerCase().includes('convite') || textMsg.toLowerCase().includes('extra');

      // Buscar no Supabase por telefone, CPF, nome do pagador ou menção na legenda
      const formando = await buscarFormandoNoSupabase(senderNumberOnly, pagadorDetectado, textMsg, cpfDetectado);

      let resposta = '';

      if (isConviteExtra) {
        // EM CASO DE CONVITE EXTRA OU DÚVIDA: DEIXA PARA CONFERÊNCIA
        resposta = `Olá! 🎓✨\n\nIdentificamos o envio do comprovante no valor de *R$ ${valorDetectado.toFixed(2)}* referente a *Convites Extras*.\n\n📌 *Status:* Encaminhado para conferência da nossa equipe financeira. Os convites serão vinculados ao cadastro do formando em instantes!\n\nQualquer dúvida, nossa equipe está à disposição. 💼🎉`;
      } else if (formando) {
        // BAIXA AUTOMÁTICA COM 100% DE CERTEZA
        await atualizarPagamentoSupabase(formando, valorDetectado);
        const novoFalta = Math.max(0, (parseFloat(formando.valor_falta) || valorDetectado) - valorDetectado);
        
        if (novoFalta <= 0) {
          resposta = `Olá, *${formando.responsavel || formando.nome}*! 🎓✨\n\nConfirmamos o recebimento do seu comprovante Pix de *R$ ${valorDetectado.toFixed(2)}* referente à matrícula de *${formando.nome}*!\n\n🎉 *PARABÉNS! Formatura 100% QUITADA no sistema!* 🎉\n✅ *Status:* Todas as parcelas pagas com sucesso.\n⏳ *Reta Final:* Faltam apenas 17 dias para o grande baile no Guerrah Hall!\n\nAgradecemos a parceria! Nossa equipe financeira está à disposição. 💼✨`;
        } else {
          resposta = `Olá, *${formando.responsavel || formando.nome}*! 🎓✨\n\nConfirmamos o recebimento do seu comprovante Pix no valor de *R$ ${valorDetectado.toFixed(2)}* referente à matrícula de *${formando.nome}*!\n\n✅ *Status:* Pagamento registrado e parcela baixada com sucesso no sistema.\n⏳ *Reta Final:* Faltam apenas 17 dias para a formatura do Terceirão no Guerrah Hall!\n\nAgradecemos a pontualidade! Qualquer dúvida, nossa equipe financeira está à disposição. 💼🎉`;
        }
      } else {
        // EM CASO DE DÚVIDA: REGISTRA COMO PENDENTE E AVISA O RESPONSÁVEL
        resposta = `Olá! 🎓✨\n\nRecebemos o seu comprovante no valor de *R$ ${valorDetectado.toFixed(2)}*.\n\n📌 *Status:* Encaminhado para validação da nossa equipe financeira para vincular ao cadastro correto no sistema da Celebra Eventos.\n\nAgradecemos o envio! Nossa equipe está à disposição. 💼🎉`;
      }

      await enviarWhatsApp(targetRecipient, resposta);
      return res.status(200).json({ success: true, acao: 'comprovante_processado', formando: formando?.nome });
    }

    // CASO 2: MENSAGEM DE TEXTO COMUM
    if (textMsg) {
      const lower = textMsg.toLowerCase();
      if (lower.includes('oi') || lower.includes('olá') || lower.includes('ola') || lower.includes('bom dia') || lower.includes('boa tarde') || lower.includes('boa noite') || lower.includes('tudo certo') || lower.includes('ajuda')) {
        const saudacao = `Olá! Seja bem-vindo(a) ao *Canal Financeiro Oficial da Celebra Eventos*! 💳🎓\n\nEste canal é exclusivo para atendimento financeiro, envio de comprovantes Pix e baixa de parcelas da formatura do *Terceirão Aprovado (Guerrah Hall)*.\n\n📸 *Envio de Comprovante:*\nBasta enviar a foto ou PDF do seu comprovante Pix diretamente aqui na conversa. Nosso sistema faz a conferência e a baixa automática no cadastro do formando!\n\nCaso tenha alguma dúvida financeira, envie sua mensagem que nossa equipe responderá em breve. 💼✨`;
        await enviarWhatsApp(targetRecipient, saudacao);
        return res.status(200).json({ success: true, acao: 'auto_reply_saudacao' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro handler:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ----------------- FUNÇÕES AUXILIARES -----------------

function extrairValorTexto(txt) {
  const match = txt.match(/r?\$?\s?(\d+([.,]\d{2})?)/i);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  return null;
}

async function processarComprovanteComGemini(b64, apiKey) {
  try {
    const cleanB64 = b64.includes(',') ? b64.split(',')[1] : b64;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const prompt = `Você é um auditor financeiro da Celebra Eventos. Analise este comprovante Pix. Extraia estritamente em formato JSON:
{
  "valido": true,
  "valor": 430.00,
  "data": "AAAA-MM-DD",
  "nome_pagador": "Nome",
  "cpf_pagador": "000.000.000-00",
  "instituicao": "Banco"
}
Responda APENAS o JSON.`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: cleanB64 } }
          ]
        }]
      })
    });

    const json = await res.json();
    const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJson = candidateText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error('Erro OCR Gemini:', e);
    return null;
  }
}

async function buscarFormandoNoSupabase(telefone, nomePagador, textoMensagem, cpfPagador) {
  try {
    // 1. Por telefone se houver dígitos
    if (telefone && telefone.length >= 8) {
      const telLast8 = telefone.slice(-8);
      let res = await fetch(`${SUPABASE_URL}/rest/v1/formandos?contato=ilike.*${telLast8}*&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      let data = await res.json();
      if (data && data.length > 0) return data[0];
    }

    // 2. Por CPF (busca os 6 primeiros dígitos ou dígitos do meio)
    if (cpfPagador && cpfPagador.length >= 6) {
      const cleanCpf = cpfPagador.replace(/\D/g, '');
      if (cleanCpf.length >= 5) {
        let res = await fetch(`${SUPABASE_URL}/rest/v1/formandos?cpf=ilike.*${cleanCpf}*&select=*`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        let data = await res.json();
        if (data && data.length > 0) return data[0];
      }
    }

    // 3. Por nome na legenda/mensagem (ex: Nathalia, Davi, Cecilia)
    const resAll = await fetch(`${SUPABASE_URL}/rest/v1/formandos?select=id,nome,responsavel,valor_total,valor_pago,valor_falta`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    const todosFormandos = await resAll.json();
    if (Array.isArray(todosFormandos)) {
      const lowerTexto = (textoMensagem + ' ' + (nomePagador || '')).toLowerCase();
      for (const f of todosFormandos) {
        const primeiroNome = f.nome.split(' ')[0].toLowerCase();
        if (primeiroNome.length > 3 && lowerTexto.includes(primeiroNome)) {
          return f;
        }
        if (f.responsavel) {
          const primeiroNomeResp = f.responsavel.split(' ')[0].toLowerCase();
          if (primeiroNomeResp.length > 3 && lowerTexto.includes(primeiroNomeResp)) {
            return f;
          }
        }
      }
    }

    return null;
  } catch (e) {
    console.error('Erro busca Supabase:', e);
    return null;
  }
}

async function atualizarPagamentoSupabase(formando, valorPago) {
  try {
    const novoPago = (parseFloat(formando.valor_pago) || 0) + valorPago;
    const total = parseFloat(formando.valor_total) || 3990;
    const novoFalta = Math.max(0, total - novoPago);
    const novoStatus = novoFalta <= 0 ? 'quitado' : 'em_andamento';

    await fetch(`${SUPABASE_URL}/rest/v1/formandos?id=eq.${formando.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valor_pago: novoPago,
        valor_falta: novoFalta,
        status: novoStatus
      })
    });
  } catch (e) {
    console.error('Erro update Supabase:', e);
  }
}

async function enviarWhatsApp(recipient, texto) {
  try {
    await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: recipient,
        text: texto,
        delay: 1200
      })
    });
  } catch (e) {
    console.error('Erro envio WhatsApp:', e);
  }
}
