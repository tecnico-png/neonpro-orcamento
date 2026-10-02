// Função que roda no servidor do Netlify (não no navegador do cliente).
// Por isso as travas de CORS do navegador não se aplicam aqui — servidor
// conversando com servidor não tem esse bloqueio.
//
// Tenta, em ordem:
//   1. is.gd com o apelido personalizado (ex: orcamento-neonpro-joao-np-12)
//   2. is.gd sem apelido (caso o apelido já esteja em uso por outra pessoa)
//   3. shrtco.de
//   4. TinyURL
// Retorna o primeiro que funcionar.

exports.handler = async function (event) {
  const url = event.queryStringParameters?.url;
  const alias = event.queryStringParameters?.alias;

  if (!url) {
    return resposta(400, { error: 'Parâmetro "url" é obrigatório.' });
  }

  if (alias) {
    const viaApelido = await tentarIsGd(url, alias);
    if (viaApelido) return resposta(200, { shorturl: viaApelido, servico: 'is.gd (com apelido)' });
  }

  const viaIsGd = await tentarIsGd(url);
  if (viaIsGd) return resposta(200, { shorturl: viaIsGd, servico: 'is.gd' });

  const viaShrtco = await tentarShrtco(url);
  if (viaShrtco) return resposta(200, { shorturl: viaShrtco, servico: 'shrtco.de' });

  const viaTinyUrl = await tentarTinyURL(url);
  if (viaTinyUrl) return resposta(200, { shorturl: viaTinyUrl, servico: 'TinyURL' });

  return resposta(502, { error: 'Todos os serviços de encurtamento estão indisponíveis no momento.' });
};

function resposta(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj)
  };
}

async function tentarIsGd(url, alias) {
  try {
    const params = `format=json&url=${encodeURIComponent(url)}` + (alias ? `&shorturl=${encodeURIComponent(alias)}` : '');
    const resp = await fetch(`https://is.gd/create.php?${params}`);
    const data = await resp.json();
    if (!data.errorcode && data.shorturl) return data.shorturl;
    return null;
  } catch (e) {
    return null;
  }
}

async function tentarShrtco(url) {
  try {
    const resp = await fetch(`https://api.shrtco.de/v2/shorten?url=${encodeURIComponent(url)}`);
    const data = await resp.json();
    if (data.ok && data.result?.full_short_link) return data.result.full_short_link;
    return null;
  } catch (e) {
    return null;
  }
}

async function tentarTinyURL(url) {
  try {
    const resp = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    const texto = await resp.text();
    if (texto.startsWith('http')) return texto;
    return null;
  } catch (e) {
    return null;
  }
}
