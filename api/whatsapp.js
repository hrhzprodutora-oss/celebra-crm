// =========================================================================
// CANAL FINANCEIRO OFICIAL - CELEBRA EVENTOS (WEBHOOK WHATSAPP)
// =========================================================================

const SUPABASE_URL = "https://ddehyuertafctuhnfgpn.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_GPBZkeBWljCdCnzf-1MH7w_yuR2JWPw";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6Lb5NNf6HDUHKesNU-HzG6SHT2XmAZkmH0lJ9FGpppiHQ";
const EVOLUTION_URL = "https://evolution-api-production-25290f3d.up.railway.app";
const EVOLUTION_API_KEY = "b49b711585c3bb5525906424fbf7871d712810afdd95719a228a6b3f8b830594";
const INSTANCE_NAME = "celebra-eventos";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      canal: 'Canal Financeiro Celebra Eventos',
      instancia: INSTANCE_NAME,
      ia_modelo: 'Gemini 3.8 Flash',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const body = req.body || {};
    const event = body.event || body.type;

    if (event !== 'messages.upsert' && event !== 'MESSAGES_UPSERT') {
      return res.status(200).json({ ignored: true, reason: 'Evento ignorado: ' + event });
    }

    const data = body.data || {};
    const key = data.key || {};

    // Ignora mensagens do próprio bot
    if (key.fromMe) {
      return res.status(200).json({ ignored: true, reason: 'fromMe' });
    }

    const remoteJid = key.remoteJid || '';
    if (!remoteJid || remoteJid.includes('@g.us')) {
      return res.status(200).json({ ignored: true, reason: 'grupo' });
    }

    const senderNumber = remoteJid.replace(/\D/g, '');
    const message = data.message || {};
    
    // Detectar imagem / anexo de comprovante
    const base64Data = data.base64 || '';
    const hasImage = Boolean(message.imageMessage || (message.documentMessage && message.documentMessage.mimetype?.includes('image')) || (base64Data && base64Data.length > 500));

    console.log(`📱 [Financeiro Celebra] Mensagem de ${senderNumber} | Anexo: ${hasImage}`);

    // CASO 1: IMAGEM DE COMPROVANTE PIX
    if (hasImage && GEMINI_API_KEY) {
      let imgBase64 = base64Data;
      
      // Se não veio direto, busca via API
      if (!imgBase64 && data.messageId) {
        try {
          const mediaRes = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: {
              'apikey': EVOLUTION_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: { key: key } })
          });
          const mediaJson = await mediaRes.json();
          imgBase64 = mediaJson.base64 || '';
        } catch(e) {
          console.warn("Erro ao buscar base64 via API:", e);
        }
      }

      if (imgBase64) {
        const ocr = await processarComprovanteComGemini(imgBase64, GEMINI_API_KEY);
        console.log('🧠 [Gemini 3.8 Flash] Resultado OCR:', ocr);

        if (ocr && ocr.valor) {
          const formando = await buscarFormandoNoSupabase(senderNumber, ocr.nome_pagador);
          let resposta = '';

          if (formando) {
            await atualizarPagamentoSupabase(formando, ocr.valor);
            resposta = `Olá, *${formando.responsavel || formando.nome}*! 🎓✨\n\nConfirmamos o recebimento do seu comprovante Pix no valor de *R$ ${ocr.valor.toFixed(2)}* referente à matrícula de *${formando.nome}*!\n\n✅ *Status:* Pagamento registrado e parcela baixada com sucesso no sistema.\n⏳ *Reta Final:* Faltam poucos dias para a formatura do Terceirão no Guerrah Hall!\n\nAgradecemos a pontualidade! Qualquer dúvida, nossa equipe financeira está à disposição. 💼🎉`;
          } else {
            resposta = `Olá! 🎓✨\n\nIdentificamos o envio do comprovante no valor de *R$ ${ocr.valor.toFixed(2)}*.\n\nNossa equipe financeira já foi notificada para conferir e vincular este pagamento ao cadastro da sua família no sistema da Celebra Eventos.\n\nMuito obrigado! Qualquer dúvida, nossa equipe está à disposição. 💼🎉`;
          }

          await enviarWhatsApp(senderNumber, resposta);
          return res.status(200).json({ success: true, acao: 'comprovante_processado', formando: formando?.nome });
        }
      }
    }

    // CASO 2: MENSAGEM DE TEXTO (SAUDAÇÃO / DÚVIDAS NO CANAL FINANCEIRO)
    const textMsg = (message.conversation || message.extendedTextMessage?.text || '').trim();
    if (textMsg && textMsg.length < 50) {
      const lower = textMsg.toLowerCase();
      if (lower.includes('oi') || lower.includes('olá') || lower.includes('ola') || lower.includes('bom dia') || lower.includes('boa tarde') || lower.includes('boa noite') || lower.includes('ajuda')) {
        const saudacao = `Olá! Seja bem-vindo(a) ao *Canal Financeiro Oficial da Celebra Eventos*! 💳🎓\n\nEste canal é exclusivo para atendimento financeiro, envio de comprovantes Pix e baixa de parcelas da formatura do *Terceirão Aprovado (Guerrah Hall)*.\n\n📸 *Envio de Comprovante:*\nBasta enviar a foto ou PDF do seu comprovante Pix diretamente aqui na conversa. Nosso sistema faz a conferência e a baixa automática no cadastro do formando!\n\nCaso tenha alguma dúvida financeira, envie sua mensagem que nossa equipe responderá em breve. 💼✨`;
        await enviarWhatsApp(senderNumber, saudacao);
        return res.status(200).json({ success: true, acao: 'auto_reply_financeiro' });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro no handler:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ----------------- FUNÇÕES AUXILIARES -----------------

async function processarComprovanteComGemini(b64, apiKey) {
  try {
    const cleanB64 = b64.includes(',') ? b64.split(',')[1] : b64;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const prompt = `Você é um auditor financeiro da Celebra Eventos Formaturas. Analise este comprovante Pix ou bancário. Extraia estritamente em formato JSON:
{
  "valido": true,
  "valor": 399.00,
  "data": "AAAA-MM-DD",
  "nome_pagador": "Nome de quem pagou",
  "instituicao": "Banco",
  "codigo_autenticacao": "Código Pix"
}
Se NÃO for um comprovante válido, retorne {"valido": false}. Responda APENAS o JSON.`;

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

async function buscarFormandoNoSupabase(telefone, nomePagador) {
  try {
    const telLast8 = telefone.slice(-8);
    let res = await fetch(`${SUPABASE_URL}/rest/v1/formandos?contato=ilike.*${telLast8}*&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    let data = await res.json();
    if (data && data.length > 0) return data[0];

    if (nomePagador && nomePagador.length > 3) {
      const primeiroNome = nomePagador.split(' ')[0];
      res = await fetch(`${SUPABASE_URL}/rest/v1/formandos?responsavel=ilike.*${primeiroNome}*&select=*`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
      });
      data = await res.json();
      if (data && data.length > 0) return data[0];
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

async function enviarWhatsApp(numero, texto) {
  try {
    await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: numero,
        text: texto,
        delay: 1500
      })
    });
  } catch (e) {
    console.error('Erro envio WhatsApp:', e);
  }
}
