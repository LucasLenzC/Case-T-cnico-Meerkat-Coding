const $ = id => document.getElementById(id);

function money(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function number(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0));
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

async function api(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.mensagem || 'Não foi possível concluir a operação.');
  return body;
}

function alerta(texto, tipo = 'danger') {
  const elemento = $('alerta');
  elemento.textContent = texto;
  elemento.className = `alert alert-${tipo} mt-3`;
  clearTimeout(alerta.timer);
  alerta.timer = setTimeout(() => elemento.classList.add('d-none'), 5000);
}
