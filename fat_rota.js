const API_URL = "https://script.google.com/macros/s/AKfycbyz3wPotM_qv8_3rEjyKJS5ho9Tj2IGqwAgJ0jqyzGpnTPrwWBQHMrVUab_8bDUmFsbbg/exec";

// ==========================================
// 1. MOTOR DO MODAL PERSONALIZADO
// ==========================================
function showCustomModal(options) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('customModalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMessage');
    const inputsEl = document.getElementById('modalInputs');
    const in1 = document.getElementById('modalInput1');
    const in2 = document.getElementById('modalInput2');
    const label1 = document.getElementById('modalLabel1');
    const label2 = document.getElementById('modalLabel2');
    const selectContainer = document.getElementById('modalSelectContainer');
    const selectEl = document.getElementById('modalSelect');
    const selectLabel = document.getElementById('modalSelectLabel');
    const btnCancel = document.getElementById('modalBtnCancel');
    const btnOk = document.getElementById('modalBtnOk');

    titleEl.innerText = options.title || 'Aviso';
    msgEl.innerHTML = options.message || ''; 
    btnOk.className = options.okBtnClass || 'modal-btn-ok';
    btnOk.innerText = options.okText || 'OK';

    inputsEl.style.display = 'none';
    selectContainer.style.display = 'none';
    btnCancel.style.display = 'none';

    if (options.type === 'alert') {
        
    } else if (options.type === 'confirm') {
      btnCancel.style.display = 'inline-block';
      btnCancel.innerText = 'Cancelar';
    } else if (options.type === 'promptTarifa') {
      btnCancel.style.display = 'inline-block';
      inputsEl.style.display = 'block';
      btnCancel.innerText = 'Cancelar';
      label1.innerText = options.label1; in1.value = options.val1;
      label2.innerText = options.label2; in2.value = options.val2;
    } else if (options.type === 'select') {
      btnCancel.style.display = 'inline-block';
      selectContainer.style.display = 'block';
      btnCancel.innerText = 'Cancelar';
      selectLabel.innerText = options.selectLabel || 'Selecione:';
      
      selectEl.innerHTML = '';
      if (options.selectOptions) {
          options.selectOptions.forEach(opt => {
              let o = document.createElement('option');
              o.value = opt.value;
              o.innerText = opt.text;
              selectEl.appendChild(o);
          });
      }
    }

    overlay.classList.add('show');

    const cleanup = () => { overlay.classList.remove('show'); btnOk.onclick = null; btnCancel.onclick = null; };

    btnOk.onclick = () => {
      cleanup();
      if (options.type === 'promptTarifa') resolve({ v1: in1.value, v2: in2.value });
      else if (options.type === 'select') resolve({ selectedValue: selectEl.value, selectedText: selectEl.options[selectEl.selectedIndex].text });
      else resolve(true);
    };

    btnCancel.onclick = () => { cleanup(); resolve(false); };
  });
}

function cAlert(title, message) { return showCustomModal({ type: 'alert', title, message, okBtnClass: 'modal-btn-ok btn-sucesso' }); }
function cAlertError(title, message) { return showCustomModal({ type: 'alert', title, message, okBtnClass: 'modal-btn-ok' }); }
function cConfirm(title, message) { return showCustomModal({ type: 'confirm', title, message, okBtnClass: 'modal-btn-ok', okText: 'Sim, Confirmar' }); }

// ==========================================
// VARIÁVEIS DE ESTADO DO SISTEMA
// ==========================================
// Caixa 1: Financeiro (Área de Lançamentos)
let totalDepositado = 0;
let depositos = [];
let proximoIdDeposito = 1;

let planilhasLancadas = [];
let todosRegistrosMaster = [];
let proximoIdPlanilha = 1;
let balancosSemanais = [];
let proximoIdBalanco = 1;
let custoAtualFiltradoGlobal = 0;

// Caixa 2: Rotas (Balanços e Escalas)
let depositosEscalas = [];
let proximoIdDepositoEscala = 1;
let historicoEscalas = [];
let proximoIdHistoricoEscala = 1;

let tarifasPorCodigo = {
  "69": { nome: "DIVINOPOLIS - COD 69", valorAte24: 72.91, valorAcima25: 69.41 },
  "239": { nome: "DIVINOPOLIS - COD 239", valorAte24: 78.06, valorAcima25: 72.05 }
};

let escalaAtualMatrix = null;
let escalaAtualCalculada = null;
let escalasDiariasSalvas = [];
let proximoIdEscalaDiaria = 1;

// ==========================================
// BANCO DE DADOS (CACHE LOCAL + NUVEM GOOGLE)
// ==========================================
function salvarDadosLocalmente() {
  let dadosSincronizados = {
    depositos, proximoIdDeposito, planilhasLancadas, todosRegistrosMaster,
    proximoIdPlanilha, balancosSemanais, proximoIdBalanco, tarifasPorCodigo,
    escalasDiariasSalvas, proximoIdEscalaDiaria,
    historicoEscalas, proximoIdHistoricoEscala,
    depositosEscalas, proximoIdDepositoEscala
  };

  localStorage.setItem('transmarina_bd_cache', JSON.stringify(dadosSincronizados));

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ chave: "DADOS_SISTEMA_TRANSMARINA", valor: JSON.stringify(dadosSincronizados) })
  }).catch(e => console.error("Aviso: Sincronização em nuvem falhou.", e));
}

async function carregarDadosLocais() {
  let cache = localStorage.getItem('transmarina_bd_cache');
  if (cache) {
    let bd = JSON.parse(cache);
    if (bd.depositos) depositos = bd.depositos;
    if (bd.proximoIdDeposito) proximoIdDeposito = bd.proximoIdDeposito;
    if (bd.planilhasLancadas) planilhasLancadas = bd.planilhasLancadas;
    if (bd.todosRegistrosMaster) todosRegistrosMaster = bd.todosRegistrosMaster;
    if (bd.proximoIdPlanilha) proximoIdPlanilha = bd.proximoIdPlanilha;
    if (bd.balancosSemanais) balancosSemanais = bd.balancosSemanais;
    if (bd.proximoIdBalanco) proximoIdBalanco = bd.proximoIdBalanco;
    if (bd.tarifasPorCodigo) tarifasPorCodigo = bd.tarifasPorCodigo;
    if (bd.escalasDiariasSalvas) escalasDiariasSalvas = bd.escalasDiariasSalvas;
    if (bd.proximoIdEscalaDiaria) proximoIdEscalaDiaria = bd.proximoIdEscalaDiaria;
    if (bd.historicoEscalas) historicoEscalas = bd.historicoEscalas;
    if (bd.proximoIdHistoricoEscala) proximoIdHistoricoEscala = bd.proximoIdHistoricoEscala;
    if (bd.depositosEscalas) depositosEscalas = bd.depositosEscalas;
    if (bd.proximoIdDepositoEscala) proximoIdDepositoEscala = bd.proximoIdDepositoEscala;
    
    atualizarTelas();
  }

  try {
    let response = await fetch(API_URL + "?t=" + new Date().getTime());
    let dadosAPI = await response.json();

    if (dadosAPI["DADOS_SISTEMA_TRANSMARINA"]) {
      let bd = JSON.parse(dadosAPI["DADOS_SISTEMA_TRANSMARINA"]);
      if (bd.depositos) depositos = bd.depositos;
      if (bd.balancosSemanais) balancosSemanais = bd.balancosSemanais;
      if (bd.planilhasLancadas) planilhasLancadas = bd.planilhasLancadas;
      if (bd.todosRegistrosMaster) todosRegistrosMaster = bd.todosRegistrosMaster;
      if (bd.tarifasPorCodigo) tarifasPorCodigo = bd.tarifasPorCodigo;
      if (bd.escalasDiariasSalvas) escalasDiariasSalvas = bd.escalasDiariasSalvas;
      if (bd.historicoEscalas) historicoEscalas = bd.historicoEscalas;
      if (bd.proximoIdHistoricoEscala) proximoIdHistoricoEscala = bd.proximoIdHistoricoEscala;
      if (bd.depositosEscalas) depositosEscalas = bd.depositosEscalas;
      if (bd.proximoIdDepositoEscala) proximoIdDepositoEscala = bd.proximoIdDepositoEscala;
      
      localStorage.setItem('transmarina_bd_cache', JSON.stringify(bd));
      atualizarTelas();
    }
  } catch (e) {
    console.error("Modo Offline Ativo.");
  }
}

function atualizarTelas() {
  recalcularTotalDepositosFinanceiro();
  renderizarTabelaDepositosFinanceiro();
  renderizarTabelaTarifasCodigo();
  atualizarResumoPlanilhas();
  renderizarTabelaFechamentosSalvos();
  renderizarTabelaEscalasSalvas();
  renderizarTabelaHistoricoEscalas();
  renderizarFiltrosFinanceiroInstantaneo();
}

// ==========================================
// FUNÇÕES UTILITÁRIAS E GLOBAIS
// ==========================================
function formatarMoeda(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function converterParaNumero(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  let str = String(val).trim().replace(/R\$/g, '').replace(/\s/g, '');
  if (str.includes(',') && str.includes('.')) str = str.replace(/\./g, '').replace(',', '.');
  else if (str.includes(',')) str = str.replace(',', '.');
  let num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseDataISO(dataValor) {
  if (!dataValor) return null;
  try {
    if (typeof dataValor === 'number' && typeof XLSX !== 'undefined') {
      let dateObj = XLSX.SSF.parse_date_code(dataValor);
      if (dateObj) return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
    }
    let d = new Date(dataValor);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch(e) {}
  return null;
}

function formatarDataBR(isoString) {
  if (!isoString) return '-';
  let partes = isoString.split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : isoString;
}

// NOVA FUNÇÃO GLOBAL E SEGURA
function converterParaISO(dataStr) {
    if (!dataStr || dataStr === '-') return null;
    let str = String(dataStr).replace(/,/g, '').trim(); // Remove a vírgula
    
    // Procura o padrão de data no meio da string
    let match = str.match(/(\d{1,4}[-/]\d{1,2}[-/]\d{1,4})/);
    if (!match) return null;
    
    let dataLimpa = match[0];
    if (dataLimpa.includes('-') && dataLimpa.split('-')[0].length === 4) return dataLimpa.split('T')[0];
    if (dataLimpa.includes('/')) {
        let p = dataLimpa.split('/');
        let dia = p[0].padStart(2, '0');
        let mes = p[1].padStart(2, '0');
        let ano = p[2];
        return `${ano}-${mes}-${dia}`;
    }
    return null;
}

// CORREÇÃO: Limpa vírgulas e espaços
function extrairDataAbreviada(dataRaw) {
  if (!dataRaw) return '-';
  let str = String(dataRaw).replace(/,/g, '').trim(); 
  
  if (str.match(/[a-zA-Z]/)) {
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR'); 
  }
  
  if (str.includes('-') && str.split('-')[0].length === 4) {
    let p = str.split('T')[0].split('-');
    return `${p[2]}/${p[1]}/${p[0]}`;
  }
  
  if (str.includes('.')) {
    return str.replace(/\./g, '/').split(' ')[0];
  }
  
  if (str.includes('/')) {
    return str.split(' ')[0];
  }
  
  return str;
}

function formatarDataSimples(dataStr) {
  if (!dataStr) return '-';
  if (String(dataStr).includes('GMT') || String(dataStr).includes('Z') || String(dataStr).includes('Horário') || String(dataStr).match(/[a-zA-Z]/)) {
    let d = new Date(dataStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  }
  return extrairDataAbreviada(dataStr);
}

function trocarAba(idAba, elemento) {
  document.querySelectorAll('.tab-content').forEach(aba => aba.classList.remove('active'));
  document.querySelectorAll('.nav-tab-link').forEach(btn => btn.classList.remove('active'));
  document.getElementById(idAba).classList.add('active');
  elemento.classList.add('active');
  
  if (idAba === 'abaBalancosEscalas') renderizarTabelaEscalasSalvas();
  if (idAba === 'abaHistoricoSemanalEscalas') renderizarTabelaHistoricoEscalas();
  if (idAba === 'abaDashboard') renderizarFiltrosFinanceiroInstantaneo();
}

// ==========================================
// CAIXA 1: DEPÓSITOS (FINANCEIRO / ÁREA DE LANÇAMENTO)
// ==========================================
async function adicionarDeposito(event) {
  if (event) event.preventDefault(); 
  let dataInput = document.getElementById('dataDeposito').value;
  let valorInput = document.getElementById('valorDeposito').value;
  let valor = parseFloat(valorInput);

  if (!isNaN(valor) && valor > 0) {
    depositos.push({ id: proximoIdDeposito++, data: dataInput ? formatarDataBR(dataInput) : new Date().toLocaleDateString('pt-BR'), valor: valor });
    document.getElementById('valorDeposito').value = '';
    document.getElementById('dataDeposito').value = '';
    
    recalcularTotalDepositosFinanceiro();
    renderizarTabelaDepositosFinanceiro();
    renderizarFiltrosFinanceiroInstantaneo();
    salvarDadosLocalmente();
  } else {
    cAlertError('Atenção', 'Digite um valor de depósito válido.');
  }
}

async function excluirDeposito(idDeposito) {
  let confirma = await cConfirm('Excluir', 'Deseja realmente excluir este lançamento de depósito pré-pago do Financeiro?');
  if (confirma) {
    depositos = depositos.filter(d => d.id !== idDeposito);
    recalcularTotalDepositosFinanceiro();
    renderizarTabelaDepositosFinanceiro();
    renderizarFiltrosFinanceiroInstantaneo();
    salvarDadosLocalmente();
  }
}

function recalcularTotalDepositosFinanceiro() {
  totalDepositado = depositos.reduce((acc, d) => acc + d.valor, 0);
}

function renderizarTabelaDepositosFinanceiro() {
  let tbody = document.getElementById('tabelaDepositos').getElementsByTagName('tbody')[0];
  tbody.innerHTML = depositos.length === 0 ? '<tr id="linhaVaziaDepositos"><td colspan="3" style="text-align:center; color:#888;">Nenhum depósito cadastrado.</td></tr>' : '';
  depositos.forEach(d => {
    let row = tbody.insertRow();
    row.insertCell(0).innerText = extrairDataAbreviada(d.data);
    row.insertCell(1).innerText = formatarMoeda(d.valor);
    row.insertCell(2).innerHTML = `<button type="button" class="btn-perigo" onclick="excluirDeposito(${d.id})" style="padding:5px 10px; font-size:12px;">Excluir</button>`;
  });
}

// ==========================================
// CAIXA 2: DEPÓSITOS DAS ESCALAS (ROTAS)
// ==========================================
async function adicionarDepositoPelaEscala() {
  let dataInput = document.getElementById('dataDepositoEscala').value;
  let valorInput = document.getElementById('valorDepositoEscala').value;
  let valor = parseFloat(valorInput);

  if (!isNaN(valor) && valor > 0) {
    depositosEscalas.push({ 
      id: proximoIdDepositoEscala++, 
      data: dataInput ? formatarDataBR(dataInput) : new Date().toLocaleDateString('pt-BR'), 
      valor: valor 
    });
    
    document.getElementById('valorDepositoEscala').value = '';
    document.getElementById('dataDepositoEscala').value = '';
    
    renderizarTabelaEscalasSalvas(); // Atualiza a UI na hora
    salvarDadosLocalmente();
    cAlert('Crédito Adicionado', 'O valor foi adicionado exclusivamente ao painel de Rotas (Balanços e Escalas)!');
  } else {
    cAlertError('Atenção', 'Digite um valor de depósito válido.');
  }
}

// ==========================================
// TARIFAS DE ROTAS
// ==========================================
async function salvarTarifaCodigo(event) {
  if (event) event.preventDefault();
  let cod = document.getElementById('inputCodRegiao').value.trim();
  let nome = document.getElementById('inputNomeCodRegiao').value.trim();
  let valAte24 = parseFloat(document.getElementById('inputValorAte24').value);
  let valAcima25 = parseFloat(document.getElementById('inputValorAcima25').value);

  if (cod && !isNaN(valAte24) && valAte24 >= 0 && !isNaN(valAcima25) && valAcima25 >= 0) {
    let jaExiste = tarifasPorCodigo[cod];
    tarifasPorCodigo[cod] = { nome: nome || (jaExiste ? jaExiste.nome : `Região ${cod}`), valorAte24: valAte24, valorAcima25: valAcima25 };

    document.getElementById('inputCodRegiao').value = '';
    document.getElementById('inputNomeCodRegiao').value = '';
    document.getElementById('inputValorAte24').value = '';
    document.getElementById('inputValorAcima25').value = '';

    renderizarTabelaTarifasCodigo();
    salvarDadosLocalmente();
    if (escalaAtualMatrix) recalcularEscalaComTarifas();

    cAlert('Salvo', `Tarifas para a região Cód. ${cod} atualizadas com sucesso!`);
  } else {
    cAlertError('Atenção', 'Preencha um código e valores válidos para ambas as faixas.');
  }
}

async function editarTarifaCodigo(cod) {
  let item = tarifasPorCodigo[cod];
  if (!item) return;

  let respostas = await showCustomModal({
    type: 'promptTarifa',
    title: `[Cód. ${cod}] - ${item.nome}`,
    message: 'Edite os valores base de pagamento para a região:',
    label1: 'Até 24 Paradas (R$):',
    val1: item.valorAte24,
    label2: 'Acima de 25 Paradas (R$):',
    val2: item.valorAcima25,
    okText: 'Salvar Alterações',
    okBtnClass: 'modal-btn-ok btn-sucesso'
  });

  if (!respostas) return;

  let num1 = parseFloat(respostas.v1.replace(',', '.'));
  let num2 = parseFloat(respostas.v2.replace(',', '.'));

  if (!isNaN(num1) && num1 >= 0 && !isNaN(num2) && num2 >= 0) {
    tarifasPorCodigo[cod].valorAte24 = num1;
    tarifasPorCodigo[cod].valorAcima25 = num2;
    renderizarTabelaTarifasCodigo();
    salvarDadosLocalmente();
    if (escalaAtualMatrix) recalcularEscalaComTarifas();
    cAlert('Sucesso', 'Valores de tarifa alterados com sucesso!');
  } else {
    cAlertError('Erro', 'Você digitou um valor inválido.');
  }
}

async function excluirTarifaCodigo(cod) {
  let confirma = await cConfirm('Excluir Tarifa', `Tem certeza que deseja remover a tarifa do código "${cod}"?`);
  if (confirma) {
    delete tarifasPorCodigo[cod];
    renderizarTabelaTarifasCodigo();
    salvarDadosLocalmente();
    if (escalaAtualMatrix) recalcularEscalaComTarifas();
  }
}

function renderizarTabelaTarifasCodigo() {
  let tbody = document.getElementById('tabelaTarifasCodigo').getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';
  let chaves = Object.keys(tarifasPorCodigo);
  document.getElementById('qtdTarifasBadge').innerText = chaves.length;

  if (chaves.length === 0) {
    tbody.innerHTML = '<tr id="linhaVaziaTarifas"><td colspan="5" style="text-align:center; color:#888;">Nenhuma tarifa cadastrada.</td></tr>';
    return;
  }

  chaves.forEach(cod => {
    let item = tarifasPorCodigo[cod];
    let row = tbody.insertRow();
    row.insertCell(0).innerHTML = `<span class="badge-codigo">Cód. ${cod}</span>`;
    row.insertCell(1).innerText = item.nome;
    row.insertCell(2).innerText = formatarMoeda(item.valorAte24);
    row.insertCell(3).innerText = formatarMoeda(item.valorAcima25);
    row.insertCell(4).innerHTML = `<button type="button" class="btn-alerta" onclick="editarTarifaCodigo('${cod}')" style="padding: 5px 10px; margin-right: 5px; font-size: 12px;">Editar</button>` +
                                  `<button type="button" class="btn-perigo" onclick="excluirTarifaCodigo('${cod}')" style="padding: 5px 10px; font-size: 12px;">Excluir</button>`;
  });
}

function filtrarTarifas() {
  let termo = document.getElementById('inputPesquisaTarifa').value.toLowerCase();
  let trs = document.getElementById('tabelaTarifasCodigo').getElementsByTagName('tbody')[0].getElementsByTagName('tr');
  
  for (let i = 0; i < trs.length; i++) {
    if (trs[i].id === 'linhaVaziaTarifas') continue;
    let textoLinha = trs[i].innerText.toLowerCase();
    trs[i].style.display = textoLinha.includes(termo) ? '' : 'none';
  }
}

// ==========================================
// PROCESSAMENTO DE ESCALAS DIÁRIAS (.XLSX)
// ==========================================
async function processarEscalasDefinitivas() {
  let fileInput = document.getElementById('inputEscalaExcel');
  let files = fileInput.files;

  if (!files || files.length === 0) {
    cAlertError('Falta Arquivo', 'Selecione ao menos um arquivo de escala diária (.xlsx) para processar.');
    return;
  }

  let arquivosLidos = 0;
  let matrizConsolidada = []; 

  Array.from(files).forEach((file) => {
    let reader = new FileReader();
    reader.onload = function(e) {
      try {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, { type: 'array' });
        let firstSheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[firstSheetName];
        let matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: "" });

        if (matrix && matrix.length > 0) {
          let dataDestaPlanilha = "-";
          for (let r = 0; r < Math.min(15, matrix.length); r++) {
            for (let c = 0; c < matrix[r].length; c++) {
              let valStr = String(matrix[r][c] || '').trim();
              if (/\d/.test(valStr) && valStr.length <= 10 && (valStr.includes('.') || valStr.includes('/'))) {
                dataDestaPlanilha = valStr; 
                break;
              }
            }
            if (dataDestaPlanilha !== "-") break;
          }

          let idxHeader = matrix.findIndex(r => r.join(' ').toUpperCase().includes('F. CARGA'));
          
          if (idxHeader !== -1) {
            let cabecalho = matrix[idxHeader];
            let linhasDeDados = matrix.slice(idxHeader + 1);
            
            linhasDeDados.forEach(row => {
               matrizConsolidada.push({
                   dataPlanilha: dataDestaPlanilha,
                   cabecalho: cabecalho,
                   row: row
               });
            });
          }
        }
      } catch (err) {
        cAlertError('Erro de Leitura', `Ocorreu um erro ao ler o arquivo ${file.name}:\n${err.message}`);
      } finally {
        arquivosLidos++;
        if (arquivosLidos === files.length) {
          escalaAtualMatrix = matrizConsolidada;
          recalcularEscalaComTarifas(true);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function recalcularEscalaComTarifas(exibirAlerta = false) {
  if (!escalaAtualMatrix || escalaAtualMatrix.length === 0) return;
  
  let itensEscala = [], custoTotalEscala = 0, totalEntregasEscala = 0;
  let datasEncontradas = new Set(); 

  for (let i = 0; i < escalaAtualMatrix.length; i++) {
    let itemData = escalaAtualMatrix[i];
    let row = itemData.row;
    let cabecalho = itemData.cabecalho;
    
    if (!row || row.length === 0) continue;

    let getIndex = (termosBusca) => {
        return cabecalho.findIndex(c => termosBusca.some(t => String(c).toUpperCase().includes(t)));
    };

    let idxBox = getIndex(['BOX']);
    let idxFCarga = getIndex(['F. CARGA', 'F.CARGA', 'CARGA']);
    let idxRegiaoCod = getIndex(['COD REGIÕES', 'COD', 'CÓD', 'CÓDIGO']);
    let idxRegiaoDesc = getIndex(['REGIÃO DE ENTREGA', 'REGIAO', 'DESCRIÇÃO']);
    let idxParadas = getIndex(['ENTREGAS', 'PARADAS', 'QTD']);
    let idxMotorista = getIndex(['MOTORISTA', 'NOME']);

    let box = (idxBox !== -1 && row[idxBox] !== undefined) ? String(row[idxBox]).trim() : (row[0] !== undefined ? String(row[0]).trim() : '-');
    let fCarga = (idxFCarga !== -1 && row[idxFCarga] !== undefined) ? String(row[idxFCarga]).trim() : (row[1] !== undefined ? String(row[1]).trim() : '-');
    let codRegiao = (idxRegiaoCod !== -1 && row[idxRegiaoCod] !== undefined) ? String(row[idxRegiaoCod]).trim() : (row[2] !== undefined ? String(row[2]).trim() : '-');
    let regiaoEntrega = (idxRegiaoDesc !== -1 && row[idxRegiaoDesc] !== undefined) ? String(row[idxRegiaoDesc]).trim() : (row[3] !== undefined ? String(row[3]).trim() : '-');
    
    let valorParadaStr = (idxParadas !== -1 && row[idxParadas] !== undefined) ? String(row[idxParadas]) : (row[4] !== undefined ? String(row[4]) : '0');
    let paradas = parseInt(valorParadaStr.replace(/[^0-9]/g, '')) || 0;
    
    let motorista = (idxMotorista !== -1 && row[idxMotorista] !== undefined) ? String(row[idxMotorista]).trim() : (row[9] !== undefined ? String(row[9]).trim() : '-');

    if (!fCarga || fCarga === '0' || fCarga === '-' || codRegiao === '0' || codRegiao === '-' || paradas <= 0 || regiaoEntrega.toUpperCase().includes('DISPONIVEL')) continue;

    if(itemData.dataPlanilha !== "-") datasEncontradas.add(itemData.dataPlanilha);

    let tarifaInfo = tarifasPorCodigo[codRegiao];
    
    let tarifaUnitaria = 0;
    let faixaAplicada = "SEM CADASTRO";
    
    if (tarifaInfo) {
        if (paradas <= 24) {
            tarifaUnitaria = tarifaInfo.valorAte24;
            faixaAplicada = "Até 24";
        } else {
            tarifaUnitaria = tarifaInfo.valorAcima25;
            faixaAplicada = "Acima de 25";
        }
    }
    
    let custoCarga = paradas * tarifaUnitaria;
    custoTotalEscala += custoCarga;
    totalEntregasEscala += paradas;

    itensEscala.push({ 
        box, fCarga, codRegiao, regiao: regiaoEntrega, 
        paradas, faixaAplicada, motorista, 
        tarifaUnitaria, custoCarga, 
        ticketMedio: paradas > 0 ? custoCarga / paradas : 0,
        dataAssociada: itemData.dataPlanilha
    });
  }

  let tituloDatas = datasEncontradas.size > 0 ? Array.from(datasEncontradas).join(', ') : new Date().toLocaleDateString('pt-BR');

  escalaAtualCalculada = {
    dataEscala: tituloDatas,
    qtdCargas: itensEscala.length, 
    totalEntregas: totalEntregasEscala, 
    custoTotal: custoTotalEscala,
    ticketMedioGeral: totalEntregasEscala > 0 ? custoTotalEscala / totalEntregasEscala : 0, 
    itens: itensEscala
  };

  document.getElementById('txtDataEscala').innerText = escalaAtualCalculada.dataEscala;
  document.getElementById('txtQtdCargasEscala').innerText = `${escalaAtualCalculada.qtdCargas} carga(s)`;
  document.getElementById('txtTotalEntregasEscala').innerText = escalaAtualCalculada.totalEntregas;
  document.getElementById('txtCustoTotalEscala').innerText = formatarMoeda(escalaAtualCalculada.custoTotal);
  document.getElementById('txtTicketMedioGeralEscala').innerText = formatarMoeda(escalaAtualCalculada.ticketMedioGeral);

  let tbody = document.getElementById('tabelaEscalaDetalhada').getElementsByTagName('tbody')[0];
  tbody.innerHTML = itensEscala.length === 0 ? '<tr><td colspan="10" style="text-align:center; color:#888;">Nenhuma carga ativa encontrada.</td></tr>' : '';

  itensEscala.forEach(item => {
    let tr = tbody.insertRow();
    tr.insertCell(0).innerText = item.box;
    tr.insertCell(1).innerText = item.fCarga;
    tr.insertCell(2).innerHTML = `<span class="badge-codigo">Cód. ${item.codRegiao}</span>`;
    tr.insertCell(3).innerText = item.regiao;
    tr.insertCell(4).innerText = item.paradas;
    
    if (item.faixaAplicada === "Até 24") {
        tr.insertCell(5).innerHTML = `<span class="badge-faixa1">Até 24</span>`;
    } else if (item.faixaAplicada === "Acima de 25") {
        tr.insertCell(5).innerHTML = `<span class="badge-faixa2">Acima 25</span>`;
    } else {
        tr.insertCell(5).innerHTML = `<span style="background:#f8d7da; color:#721c24; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold;">⚠️ NÃO CADASTRADO</span>`;
    }
    
    tr.insertCell(6).innerText = item.motorista;
    tr.insertCell(7).innerText = formatarMoeda(item.tarifaUnitaria);
    tr.insertCell(8).innerText = formatarMoeda(item.custoCarga);
    tr.insertCell(9).innerText = formatarMoeda(item.ticketMedio);
  });

  if (exibirAlerta) {
    if(datasEncontradas.size > 1) {
       cAlert('Várias Escalas Importadas', `Foram processadas ${itensEscala.length} cargas.\nDatas: ${tituloDatas}`);
    } else {
       cAlert('Sucesso!', `Foram processadas ${itensEscala.length} cargas.`);
    }
  }
}

async function limparEscalaAtual() {
  if (!escalaAtualCalculada && !escalaAtualMatrix) {
    cAlertError('Aviso', 'Nenhuma escala carregada na tela.');
    return;
  }
  let confirma = await cConfirm('Limpar', 'Deseja remover os lançamentos da escala atual?');
  if (confirma) {
    escalaAtualMatrix = null; escalaAtualCalculada = null;
    document.getElementById('inputEscalaExcel').value = '';
    document.getElementById('txtDataEscala').innerText = '-';
    document.getElementById('txtQtdCargasEscala').innerText = '0 carga(s)';
    document.getElementById('txtTotalEntregasEscala').innerText = '0';
    document.getElementById('txtCustoTotalEscala').innerText = formatarMoeda(0);
    document.getElementById('txtTicketMedioGeralEscala').innerText = formatarMoeda(0);
    document.getElementById('tabelaEscalaDetalhada').getElementsByTagName('tbody')[0].innerHTML = '<tr><td colspan="10" style="text-align:center; color:#888;">Aguardando o anexo...</td></tr>';
  }
}

async function salvarEscalaDiariaNoHistorico() {
  if (!escalaAtualCalculada) {
    cAlertError('Faltam Dados', 'Processe uma escala antes de salvar.');
    return;
  }
  let novaEscalaSalva = {
    id: proximoIdEscalaDiaria++,
    dataEscala: escalaAtualCalculada.dataEscala,
    dataRegistro: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
    qtdCargas: escalaAtualCalculada.qtdCargas,
    totalEntregas: escalaAtualCalculada.totalEntregas,
    custoTotal: escalaAtualCalculada.custoTotal,
    ticketMedio: escalaAtualCalculada.ticketMedioGeral,
    itens: escalaAtualCalculada.itens
  };

  escalasDiariasSalvas.push(novaEscalaSalva);
  renderizarTabelaEscalasSalvas();
  salvarDadosLocalmente();
  cAlert('Registro Salvo', `Escala do dia ${novaEscalaSalva.dataEscala} integrada com sucesso!`);
}

async function excluirEscalaSalva(idEscala) {
  let confirma = await cConfirm('Apagar Escala', 'Certeza que deseja excluir este dia?');
  if (confirma) {
    escalasDiariasSalvas = escalasDiariasSalvas.filter(e => e.id !== idEscala);
    renderizarTabelaEscalasSalvas();
    salvarDadosLocalmente();
  }
}

function obterPeriodoDaSemana(dataLimpa) {
  if (!dataLimpa || dataLimpa === '-') return '-';
  
  let partes = dataLimpa.split('/');
  if (partes.length < 3) return dataLimpa;

  let d = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
  if (isNaN(d.getTime())) return dataLimpa;

  let diaSemana = d.getDay(); 
  let difSegunda = d.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
  let segunda = new Date(d.setDate(difSegunda));
  
  let domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);

  let diaSeg = String(segunda.getDate()).padStart(2, '0');
  let mesSeg = String(segunda.getMonth() + 1).padStart(2, '0');
  let anoSeg = segunda.getFullYear();

  let diaDom = String(domingo.getDate()).padStart(2, '0');
  let mesDom = String(domingo.getMonth() + 1).padStart(2, '0');
  let anoDom = domingo.getFullYear();

  return `${diaSeg}/${mesSeg}/${anoSeg} a ${diaDom}/${mesDom}/${anoDom}`;
}


// ==========================================
// RENDERIZAÇÃO INTELIGENTE DO CONSOLIDADO (ROTAS)
// ==========================================
function renderizarTabelaEscalasSalvas() {
  let elQtd = document.getElementById('qtdEscalasTab');

  let tbody = document.getElementById('tabelaEscalasDiariasSalvas');
  if (tbody) tbody = tbody.getElementsByTagName('tbody')[0];
  if (!tbody) return;
  
  tbody.innerHTML = '';

  let dataInicio = document.getElementById('filtroEscalaInicio') ? document.getElementById('filtroEscalaInicio').value : '';
  let dataFim = document.getElementById('filtroEscalaFim') ? document.getElementById('filtroEscalaFim').value : '';

  let escalasFiltradas = escalasDiariasSalvas.filter(e => {
      if (!dataInicio && !dataFim) return true;
      let dataLimpa = extrairDataAbreviada(e.dataEscala);
      let isoData = converterParaISO(dataLimpa);
      if (!isoData) return true;
      if (dataInicio && isoData < dataInicio) return false;
      if (dataFim && isoData > dataFim) return false;
      return true;
  });

  let depositosEscalasFiltrados = depositosEscalas.filter(d => {
      if (!dataInicio && !dataFim) return true;
      let dataLimpa = extrairDataAbreviada(d.data);
      let isoData = converterParaISO(dataLimpa);
      if (!isoData) return true;
      if (dataInicio && isoData < dataInicio) return false;
      if (dataFim && isoData > dataFim) return false;
      return true;
  });

  if (elQtd) elQtd.innerText = escalasFiltradas.length;

  let somaCustoSemana = 0, somaEntregasSemana = 0;

  escalasFiltradas.forEach(e => {
    somaCustoSemana += e.custoTotal;
    somaEntregasSemana += e.totalEntregas;

    let tr = tbody.insertRow();
    let dataFormatada = formatarDataSimples(e.dataEscala);
    tr.insertCell(0).innerHTML = `<span class="box-info" style="white-space: nowrap; font-weight: 600;">${dataFormatada}</span>`;
    
    let periodoCalculado = obterPeriodoDaSemana(dataFormatada);
    tr.insertCell(1).innerHTML = `<span style="font-size: 11px; color: #555; white-space: nowrap;">${periodoCalculado}</span>`;
    
    tr.insertCell(2).innerHTML = `<span style="font-weight: 600; color: #333; font-size: 14px;">${e.totalEntregas}</span>`;
    tr.insertCell(3).innerHTML = `<span class="box-numero">${formatarMoeda(e.custoTotal)}</span>`;
    tr.insertCell(4).innerHTML = `<span class="box-numero">${formatarMoeda(e.ticketMedio)}</span>`;
    tr.insertCell(5).innerHTML = `<button type="button" class="btn-perigo" onclick="excluirEscalaSalva(${e.id})" style="padding:5px 10px; font-size:12px;">Excluir</button>`;
  });

  if (escalasFiltradas.length === 0) {
    tbody.innerHTML = '<tr id="linhaVaziaEscalasSalvas"><td colspan="6" style="text-align:center; color:#888;">Nenhum registro encontrado neste período.</td></tr>';
  }

  let ticketMedioSemanal = somaEntregasSemana > 0 ? (somaCustoSemana / somaEntregasSemana) : 0;
  
  let tetoOperacional = depositosEscalasFiltrados.reduce((acc, d) => acc + d.valor, 0);
  let saldoCreditoSemana = tetoOperacional - somaCustoSemana;

  let elCred = document.getElementById('txtSemanaCreditoTotal'); if(elCred) elCred.innerText = formatarMoeda(tetoOperacional);
  let elCusto = document.getElementById('txtSemanaCustoTotal'); if(elCusto) elCusto.innerText = formatarMoeda(somaCustoSemana);
  let elTick = document.getElementById('txtSemanaTicketMedioGeral'); if(elTick) elTick.innerText = formatarMoeda(ticketMedioSemanal);
  
  let cardSaldo = document.getElementById('cardSemanaSaldoCredito');
  let txtSaldo = document.getElementById('txtSemanaSaldoCredito');
  if(txtSaldo && cardSaldo) {
    txtSaldo.innerText = formatarMoeda(saldoCreditoSemana);
    cardSaldo.className = saldoCreditoSemana >= 0 ? "card verde" : "card vermelho";
  }
}

// ==========================================
// FECHAMENTO DA EQUIPE DE ESCALAS (ROTAS) - COM CTRL+Z
// ==========================================
async function salvarFechamentoEscalas() {
  let elTeto = document.getElementById('txtSemanaCreditoTotal');
  let elCusto = document.getElementById('txtSemanaCustoTotal');
  let elTicket = document.getElementById('txtSemanaTicketMedioGeral');
  
  let valTeto = elTeto ? elTeto.innerText : 'R$ 0,00';
  let valCusto = elCusto ? elCusto.innerText : 'R$ 0,00';
  let valTicket = elTicket ? elTicket.innerText : 'R$ 0,00';

  let numTeto = converterParaNumero(valTeto);
  let numCusto = converterParaNumero(valCusto);
  
  if (numTeto === 0 && numCusto === 0) {
      cAlertError('Painel Vazio', 'Não há valores filtrados para serem salvos.');
      return;
  }

  let dataInicio = document.getElementById('filtroEscalaInicio').value;
  let dataFim = document.getElementById('filtroEscalaFim').value;
  
  // NOVA REGRA DE NOMENCLATURA DO PERÍODO
  let periodo = 'Período Geral';
  if (dataInicio && dataFim) {
      periodo = `${formatarDataBR(dataInicio)} a ${formatarDataBR(dataFim)}`;
  } else if (dataInicio) {
      periodo = `A partir de ${formatarDataBR(dataInicio)}`;
  } else if (dataFim) {
      periodo = `Até ${formatarDataBR(dataFim)}`;
  }

  let confirma = await cConfirm('Salvar Balanço Semanal (Rotas)', `Deseja salvar o fechamento atual e limpar as escalas/depósitos filtrados da tela?\n\nPeríodo: ${periodo}\nCrédito Utilizado: ${valTeto}\nValor Gasto: ${valCusto}`);
  if (!confirma) return;

  let escalasRemovidas = [];
  let escalasRestantes = [];
  escalasDiariasSalvas.forEach(e => {
      let manter = false;
      if (!dataInicio && !dataFim) { manter = false; }
      else {
          let isoData = converterParaISO(extrairDataAbreviada(e.dataEscala));
          if (!isoData) manter = false; 
          else if (dataInicio && isoData < dataInicio) manter = true; 
          else if (dataFim && isoData > dataFim) manter = true; 
          else manter = false;
      }
      if (manter) escalasRestantes.push(e);
      else escalasRemovidas.push(e);
  });
  escalasDiariasSalvas = escalasRestantes;

  let depositosRemovidos = [];
  let depositosRestantes = [];
  depositosEscalas.forEach(d => {
      let manter = false;
      if (!dataInicio && !dataFim) { manter = false; }
      else {
          let isoData = converterParaISO(extrairDataAbreviada(d.data));
          if (!isoData) manter = false; 
          else if (dataInicio && isoData < dataInicio) manter = true; 
          else if (dataFim && isoData > dataFim) manter = true; 
          else manter = false;
      }
      if (manter) depositosRestantes.push(d);
      else depositosRemovidos.push(d);
  });
  depositosEscalas = depositosRestantes;

  historicoEscalas.push({
      id: proximoIdHistoricoEscala++,
      dataRegistro: new Date().toLocaleDateString('pt-BR'),
      periodo: periodo,
      creditoUtilizado: numTeto,
      valorGasto: numCusto,
      saldo: numTeto - numCusto,
      ticketMedio: converterParaNumero(valTicket),
      escalasOriginais: escalasRemovidas,
      depositosOriginais: depositosRemovidos
  });

  renderizarTabelaEscalasSalvas();
  renderizarTabelaHistoricoEscalas();
  salvarDadosLocalmente();

  cAlert('Balanço de Rotas Salvo', 'O histórico foi arquivado com sucesso!\n\n(Se precisar, ao excluir este histórico as escalas retornarão para a tela principal)');
}

function renderizarTabelaHistoricoEscalas() {
  let tbody = document.getElementById('tabelaHistoricoEscalas');
  if (!tbody) return;
  tbody = tbody.getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';

  if (historicoEscalas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">Nenhum balanço semanal de rotas foi salvo ainda.</td></tr>';
      return;
  }

  historicoEscalas.forEach(h => {
      let tr = tbody.insertRow();
      tr.insertCell(0).innerHTML = `<span class="box-info" style="font-weight:bold;">${h.dataRegistro}</span>`;
      tr.insertCell(1).innerText = h.periodo;
      tr.insertCell(2).innerHTML = `<span style="font-weight: 600; color: #0288d1;">${formatarMoeda(h.creditoUtilizado)}</span>`;
      tr.insertCell(3).innerHTML = `<span style="font-weight: 600; color: #c0392b;">${formatarMoeda(h.valorGasto)}</span>`;
      
      let colorSaldo = h.saldo >= 0 ? '#166534' : '#991b1b';
      tr.insertCell(4).innerHTML = `<span style="font-weight: 900; color: ${colorSaldo};">${formatarMoeda(h.saldo)}</span>`;
      
      tr.insertCell(5).innerHTML = `<span class="box-numero">${formatarMoeda(h.ticketMedio)}</span>`;
      tr.insertCell(6).innerHTML = `<button type="button" class="btn-perigo" onclick="excluirHistoricoEscala(${h.id})" style="padding:5px 10px; font-size:12px;">Excluir</button>`;
  });
}

async function excluirHistoricoEscala(idHist) {
  let confirma = await cConfirm('Restaurar Escalas?', 'Tem certeza que deseja apagar este histórico de rotas?\n\nOs lançamentos e depósitos utilizados nele retornarão intactos para a tela principal (Ctrl+Z).');
  if (confirma) {
      let hist = historicoEscalas.find(h => h.id === idHist);
      if (hist) {
          if (hist.escalasOriginais) escalasDiariasSalvas.push(...hist.escalasOriginais);
          if (hist.depositosOriginais) depositosEscalas.push(...hist.depositosOriginais);
      }
      historicoEscalas = historicoEscalas.filter(h => h.id !== idHist);
      renderizarTabelaEscalasSalvas();
      renderizarTabelaHistoricoEscalas();
      salvarDadosLocalmente();
  }
}

// ==========================================
// FATURAS QUINZENAIS (BALANÇO FINANCEIRO)
// ==========================================
function localizarIndiceColuna(cabecalho, termos) {
  for (let i = 0; i < cabecalho.length; i++) {
    let colTexto = String(cabecalho[i] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let termo of termos) if (colTexto.includes(termo)) return i;
  }
  return -1;
}

async function processarArquivoExcel() {
  let fileInput = document.getElementById('inputArquivoExcel');
  let files = fileInput.files;

  if (!files || files.length === 0) {
    cAlertError('Falta Arquivo', 'Selecione ao menos uma planilha (.xlsx).');
    return;
  }

  let arquivosLidos = 0;
  Array.from(files).forEach((file) => {
    let reader = new FileReader();
    reader.onload = function(e) {
      try {
        let data = new Uint8Array(e.target.result);
        let workbook = XLSX.read(data, { type: 'array' });
        let matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: true, defval: "" });

        if (!matrix || matrix.length < 2) return;

        let cabecas = matrix[0];
        let idxFechamento = localizarIndiceColuna(cabecas, ['fechamento']); idxFechamento = idxFechamento === -1 ? 0 : idxFechamento;
        let idxCarga = localizarIndiceColuna(cabecas, ['carga']); idxCarga = idxCarga === -1 ? 5 : idxCarga;
        let idxDataNota = localizarIndiceColuna(cabecas, ['datanota', 'data']); idxDataNota = idxDataNota === -1 ? 6 : idxDataNota;
        let idxFilial = localizarIndiceColuna(cabecas, ['filialorigem', 'filial']); idxFilial = idxFilial === -1 ? 7 : idxFilial;
        let idxFatura = localizarIndiceColuna(cabecas, ['totalfatura', 'fatura', 'total']); idxFatura = idxFatura === -1 ? 19 : idxFatura;

        let idPlanilha = proximoIdPlanilha++, novosRegistros = [], valorTotalPlanilha = 0, nomeFechamento = '-';

        for (let i = 1; i < matrix.length; i++) {
          let row = matrix[i];
          if (!row || row.length === 0) continue;

          let fechamento = row[idxFechamento] !== undefined ? String(row[idxFechamento]) : '-';
          let carga = row[idxCarga] !== undefined ? String(row[idxCarga]) : '-';
          let dataNotaISO = parseDataISO(row[idxDataNota]);
          let filialOrigem = row[idxFilial] !== undefined ? String(row[idxFilial]) : '-';
          let totalFatura = converterParaNumero(row[idxFatura]);

          if (fechamento !== '-' && nomeFechamento === '-') nomeFechamento = fechamento;
          valorTotalPlanilha += totalFatura;
          novosRegistros.push({ planilhaId: idPlanilha, fechamento, carga, dataNotaISO, filialOrigem, totalFatura });
        }

        planilhasLancadas.push({
          id: idPlanilha, nomeArquivo: file.name,
          dataUpload: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
          fechamento: nomeFechamento, qtdRegistros: novosRegistros.length, valorTotal: valorTotalPlanilha
        });

        todosRegistrosMaster = todosRegistrosMaster.concat(novosRegistros);

      } catch (err) {
        console.error(err);
      } finally {
        arquivosLidos++;
        if (arquivosLidos === files.length) {
          fileInput.value = '';
          atualizarResumoPlanilhas(); 
          renderizarFiltrosFinanceiroInstantaneo();
          salvarDadosLocalmente();
          cAlert('Importação Completa', `${files.length} planilha(s) extraída(s).`);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function limparPlanilhasAnexadas() {
  if (planilhasLancadas.length === 0) { cAlertError('Aviso', 'Nenhuma planilha.'); return; }
  let confirma = await cConfirm('Apagar', 'Remover faturas carregadas?');
  if (confirma) {
    planilhasLancadas = []; todosRegistrosMaster = [];
    document.getElementById('inputArquivoExcel').value = '';
    atualizarResumoPlanilhas(); 
    renderizarFiltrosFinanceiroInstantaneo();
    salvarDadosLocalmente();
  }
}

async function excluirPlanilha(idPlanilha) {
  let confirma = await cConfirm('Apagar', 'Remover esta planilha?');
  if (confirma) {
    planilhasLancadas = planilhasLancadas.filter(p => p.id !== idPlanilha);
    todosRegistrosMaster = todosRegistrosMaster.filter(r => r.planilhaId !== idPlanilha);
    atualizarResumoPlanilhas(); 
    renderizarFiltrosFinanceiroInstantaneo();
    salvarDadosLocalmente();
  }
}

function atualizarResumoPlanilhas() {
  let el = document.getElementById('qtdPlanilhasTab');
  if(el) el.innerText = planilhasLancadas.length;
  
  let tbody = document.getElementById('tabelaPlanilhasLancadas');
  if (!tbody) return;
  tbody = tbody.getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';

  if (planilhasLancadas.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">Nenhuma planilha.</td></tr>'; return; }
  planilhasLancadas.forEach(p => {
    let tr = tbody.insertRow();
    tr.insertCell(0).innerText = p.id; tr.insertCell(1).innerText = p.nomeArquivo; tr.insertCell(2).innerText = p.dataUpload;
    tr.insertCell(3).innerText = p.fechamento; tr.insertCell(4).innerText = p.qtdRegistros; tr.insertCell(5).innerText = formatarMoeda(p.valorTotal);
    tr.insertCell(6).innerHTML = `<button type="button" class="btn-perigo" onclick="excluirPlanilha(${p.id})" style="padding:5px 10px; font-size:12px;">Excluir</button>`;
  });
}

function aplicarFiltros() {
    renderizarFiltrosFinanceiroInstantaneo();
}

function renderizarFiltrosFinanceiroInstantaneo() {
    let dataInicio = document.getElementById('filtroDataInicio') ? document.getElementById('filtroDataInicio').value : '';
    let dataFim = document.getElementById('filtroDataFim') ? document.getElementById('filtroDataFim').value : '';

    let registrosFiltrados = todosRegistrosMaster.filter(r => {
      if (!r.dataNotaISO) return true; 
      let dataRegistroValidar = r.dataNotaISO;

      if (String(r.dataNotaISO).includes('GMT') || String(r.dataNotaISO).includes('Z') || String(r.dataNotaISO).match(/[a-zA-Z]/)) {
        let d = new Date(r.dataNotaISO);
        if (!isNaN(d.getTime())) {
          let localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
          dataRegistroValidar = localDate.toISOString().split('T')[0]; 
        }
      }

      if (dataInicio && dataRegistroValidar < dataInicio) return false;
      if (dataFim && dataRegistroValidar > dataFim) return false;
      return true;
    });
    
    renderizarTabelaCargas(registrosFiltrados);
}

function renderizarTabelaCargas(registros) {
  let tbody = document.getElementById('tabelaCargas');
  if(tbody) tbody = tbody.getElementsByTagName('tbody')[0];
  if(!tbody) return;
  
  tbody.innerHTML = ''; 
  custoAtualFiltradoGlobal = 0;

  if (registros.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Nenhuma fatura no período.</td></tr>';
    atualizarDashboardValores(0, 0); 
    return;
  }

  registros.forEach(r => {
    custoAtualFiltradoGlobal += r.totalFatura;
  });

  let limiteVisual = 100;
  let registrosParaExibir = registros.slice(0, limiteVisual);

  registrosParaExibir.forEach(r => {
    let tr = tbody.insertRow();
    tr.insertCell(0).innerText = r.fechamento; 
    tr.insertCell(1).innerText = r.carga; 
    
    let dataFormatada = '-';
    if (r.dataNotaISO) {
      if (String(r.dataNotaISO).includes('GMT') || String(r.dataNotaISO).includes('Z') || String(r.dataNotaISO).match(/[a-zA-Z]/)) {
        let d = new Date(r.dataNotaISO);
        if (!isNaN(d.getTime())) {
          dataFormatada = d.toLocaleDateString('pt-BR');
        } else {
          dataFormatada = formatarDataBR(r.dataNotaISO);
        }
      } else {
        dataFormatada = formatarDataBR(r.dataNotaISO);
      }
    }
    
    tr.insertCell(2).innerText = dataFormatada;
    tr.insertCell(3).innerHTML = `<span class="badge-filial">Filial ${r.filialOrigem}</span>`;
    
    let cellFatura = tr.insertCell(4); 
    cellFatura.innerText = formatarMoeda(r.totalFatura);
    
    if (r.totalFatura < 0) { 
      cellFatura.style.color = '#c0392b'; 
      cellFatura.style.fontWeight = 'bold'; 
    }
  });

  if (registros.length > limiteVisual) {
    let trAviso = tbody.insertRow();
    trAviso.innerHTML = `<td colspan="5" style="text-align:center; color:#666; font-style:italic; padding: 15px; background: #fdfdfd;">
      Exibindo ${limiteVisual} de <b>${registros.length}</b> registros.
    </td>`;
  }
  
  atualizarDashboardValores(custoAtualFiltradoGlobal, registros.length);
}

function limparFiltros() { 
    if(document.getElementById('filtroDataInicio')) document.getElementById('filtroDataInicio').value = ''; 
    if(document.getElementById('filtroDataFim')) document.getElementById('filtroDataFim').value = ''; 
    renderizarFiltrosFinanceiroInstantaneo(); 
}

function atualizarDashboardValores(custoFiltrado, qtdRegistros) {
  let saldo = totalDepositado - custoFiltrado;
  let txtTotal = document.getElementById('txtTotalDepositado');
  if(txtTotal) {
      txtTotal.innerText = formatarMoeda(totalDepositado);
      document.getElementById('txtCustoTotal').innerText = formatarMoeda(custoFiltrado);
      document.getElementById('txtSaldoDisponivel').innerText = formatarMoeda(saldo);
      document.getElementById('qtdDepositos').innerText = `${depositos.length} lançamento(s)`;
      document.getElementById('qtdLinhasPlanilha').innerText = `${qtdRegistros} registro(s) exibido(s)`;

      let cardSaldo = document.getElementById('cardSaldo'), statusSaldo = document.getElementById('statusSaldo'), alerta = document.getElementById('alertaCorte');
      if (saldo < 0) { cardSaldo.className = "card vermelho"; alerta.style.display = "block"; statusSaldo.innerText = "Saldo Negativo"; } 
      else { cardSaldo.className = "card verde"; alerta.style.display = "none"; statusSaldo.innerText = "Crédito OK"; }
  }
}

// ==========================================
// FECHAMENTO FINANCEIRO - COM CTRL+Z
// ==========================================
async function salvarFechamentoSemanal() {
  if (depositos.length === 0) {
      let confirmaSemDep = await cConfirm('Aviso', 'Nenhum depósito cadastrado.\nDeseja fechar o balanço assumindo Crédito de R$ 0,00?');
      if(!confirmaSemDep) return;
  }

  let opcoesDeAbatimento = depositos.map(d => ({ value: d.id, text: `Depósito: ${extrairDataAbreviada(d.data)} - ${formatarMoeda(d.valor)}` }));
  if (depositos.length > 0) {
      opcoesDeAbatimento.push({ value: 'TODOS', text: `ABATER DE TODOS OS DEPÓSITOS (${formatarMoeda(totalDepositado)})` });
  }

  let resposta = await showCustomModal({
      type: 'select',
      title: 'Salvar Balanço (Financeiro)',
      message: `As planilhas filtradas somam <b>${formatarMoeda(custoAtualFiltradoGlobal)}</b>.<br><br>De onde você deseja abater este valor?`,
      selectLabel: 'Selecione a Origem do Abatimento:',
      selectOptions: opcoesDeAbatimento.length > 0 ? opcoesDeAbatimento : [{value: '0', text: 'Sem Depósito / R$ 0,00'}],
      okText: 'Salvar e Abater',
      okBtnClass: 'modal-btn-ok btn-sucesso'
  });

  if (!resposta) return; 

  let dataInicio = document.getElementById('filtroDataInicio').value;
  let dataFim = document.getElementById('filtroDataFim').value;
  let periodoTexto = (dataInicio && dataFim) ? `${formatarDataBR(dataInicio)} a ${formatarDataBR(dataFim)}` : "Todas as datas";
  
  let valorCreditoAbatido = 0;
  let infoDepositoStr = "";
  
  let depositosRemovidos = [];

  if (resposta.selectedValue === 'TODOS' || resposta.selectedValue === '0') {
      valorCreditoAbatido = totalDepositado;
      infoDepositoStr = depositos.length > 0 ? depositos.map(d => extrairDataAbreviada(d.data)).join(', ') : 'Sem Depósito';
      depositosRemovidos = [...depositos];
      depositos = []; 
  } else {
      let depEscolhido = depositos.find(d => d.id == resposta.selectedValue);
      valorCreditoAbatido = depEscolhido.valor;
      infoDepositoStr = extrairDataAbreviada(depEscolhido.data);
      depositosRemovidos = [depEscolhido];
      depositos = depositos.filter(d => d.id != resposta.selectedValue);
  }

  let periodoCombinado = `<b>Depósito:</b> ${infoDepositoStr}<br><b>Faturas:</b> ${periodoTexto}`;
  let saldoCalculado = valorCreditoAbatido - custoAtualFiltradoGlobal;

  balancosSemanais.push({
    id: proximoIdBalanco++, 
    dataRegistro: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
    periodo: periodoCombinado, 
    totalCredito: valorCreditoAbatido, 
    totalFaturas: custoAtualFiltradoGlobal, 
    saldo: saldoCalculado,
    depositosOriginais: depositosRemovidos
  }); 
  
  recalcularTotalDepositosFinanceiro(); 
  renderizarTabelaDepositosFinanceiro();
  renderizarTabelaFechamentosSalvos();
  renderizarFiltrosFinanceiroInstantaneo();
  salvarDadosLocalmente(); 
  
  cAlert('Balanço Gerado!', `Fechamento encerrado.\nCrédito Utilizado: ${formatarMoeda(valorCreditoAbatido)}\nResultado: ${saldoCalculado >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'} de ${formatarMoeda(saldoCalculado)}.`);
}

function renderizarTabelaFechamentosSalvos() {
  let elQtd = document.getElementById('qtdBalançosTab'); 
  if (elQtd) elQtd.innerText = balancosSemanais.length;
  
  let tbody = document.getElementById('tabelaFechamentosSalvos');
  if (!tbody) return;
  tbody = tbody.getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';
  let somatoriaGeral = 0;

  if (balancosSemanais.length === 0) {
    tbody.innerHTML = '<tr id="linhaVaziaBalanços"><td colspan="6" style="text-align:center; color:#888;">Nenhum balanço salvo.</td></tr>';
    let elSomatoria = document.getElementById('txtSomatoriaGeralBalanços'); if (elSomatoria) elSomatoria.innerText = formatarMoeda(0);
    return;
  }

  balancosSemanais.forEach(b => {
    somatoriaGeral += b.saldo;
    let tr = tbody.insertRow();
    
    let cellData = tr.insertCell(0);
    cellData.innerHTML = `<span class="box-info" style="white-space: nowrap; font-weight: 600;">${extrairDataAbreviada(b.dataRegistro)}</span>`; 
    
    let periodoLimpo = b.periodo || '-';
    let regexDataSuja = /([a-zA-Z]{3} [a-zA-Z]{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT[^<]+)/g;
    
    periodoLimpo = periodoLimpo.replace(regexDataSuja, (textoEncontrado) => {
        return extrairDataAbreviada(textoEncontrado);
    });

    let cellPeriodo = tr.insertCell(1);
    cellPeriodo.innerHTML = `<div class="box-info" style="white-space: nowrap;">${periodoLimpo}</div>`;

    tr.insertCell(2).innerHTML = `<span class="box-numero">${formatarMoeda(b.totalCredito)}</span>`; 
    tr.insertCell(3).innerHTML = `<span class="box-numero">${formatarMoeda(b.totalFaturas)}</span>`;
    
    let cellSaldo = tr.insertCell(4);
    let classeSaldo = b.saldo >= 0 ? 'positivo' : 'negativo';
    cellSaldo.innerHTML = `<span class="box-numero ${classeSaldo}">${formatarMoeda(b.saldo)}</span>`;
    
    tr.insertCell(5).innerHTML = `<button type="button" class="btn-perigo" onclick="excluirBalancoSemanal(${b.id})" style="padding:5px 10px; font-size:12px;">Excluir</button>`;
  });

  let elSomatoria = document.getElementById('txtSomatoriaGeralBalanços');
  if (elSomatoria) {
    let cardSomatoria = elSomatoria.closest('.card');
    elSomatoria.innerText = formatarMoeda(somatoriaGeral);
    cardSomatoria.className = somatoriaGeral >= 0 ? "card verde" : "card vermelho";
  }
}

async function excluirBalancoSemanal(idBal) {
  let confirma = await cConfirm('Restaurar Depósito?', 'Deseja excluir este histórico do Financeiro?\n\nO depósito de crédito que foi utilizado retornará para a sua carteira.');
  if (confirma) {
    let bal = balancosSemanais.find(b => b.id === idBal);
    if (bal && bal.depositosOriginais) {
        depositos.push(...bal.depositosOriginais);
    }
    balancosSemanais = balancosSemanais.filter(b => b.id !== idBal);
    recalcularTotalDepositosFinanceiro();
    renderizarTabelaDepositosFinanceiro();
    renderizarTabelaFechamentosSalvos(); 
    renderizarFiltrosFinanceiroInstantaneo();
    salvarDadosLocalmente();
  }
}

function imprimirRelatorio() {
  let somatoriaBalanços = balancosSemanais.reduce((acc, b) => acc + b.saldo, 0);
  let statusGeral = somatoriaBalanços >= 0 ? 'SUPERÁVIT' : 'DÉFICIT';
  
  let somaCustoEscala = escalasDiariasSalvas.reduce((acc, e) => acc + e.custoTotal, 0);
  let tetoEscala = depositosEscalas.reduce((acc, d) => acc + d.valor, 0);
  
  let html = `
    <div style="display: flex; align-items: center; margin-bottom: 20px;">
      <h1 style="margin: 0; color: #b10a0a; font-family: 'Arial Black', sans-serif;">TRANSMARINA</h1>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
      <div style="width: 48%;">
        <h3 style="margin: 0 0 5px 0;">Histórico de Balanços Semanais (Financeiro)</h3>
        <span style="font-size: 11px; font-weight: bold; text-transform: uppercase;">Total Geral</span><br>
        <span style="font-size: 20px; font-weight: bold; color: ${somatoriaBalanços >= 0 ? '#166534' : '#991b1b'};">${formatarMoeda(somatoriaBalanços)} (${statusGeral})</span>
      </div>

      <div style="width: 48%;">
        <h3 style="margin: 0 0 5px 0;">Consolidado Atual (Rotas)</h3>
        <div style="display: flex; gap: 20px;">
          <div>
            <span style="font-size: 10px; font-weight: bold;">TETO (DEPÓSITOS)</span><br>
            <span style="font-size: 16px; font-weight: bold; color: #0288d1;">${formatarMoeda(tetoEscala)}</span>
          </div>
          <div>
            <span style="font-size: 10px; font-weight: bold;">VALOR GASTO</span><br>
            <span style="font-size: 16px; font-weight: bold; color: #c0392b;">${formatarMoeda(somaCustoEscala)}</span>
          </div>
        </div>
      </div>
    </div>
    <table class="print-table"><thead><tr><th>Data Registro</th><th>Período</th><th>Crédito</th><th>Faturas</th><th>Saldo</th></tr></thead><tbody>
  `;

  balancosSemanais.forEach(b => {
    html += `<tr><td>${extrairDataAbreviada(b.dataRegistro)}</td><td>${b.periodo}</td><td>${formatarMoeda(b.totalCredito)}</td><td>${formatarMoeda(b.totalFaturas)}</td><td>${formatarMoeda(b.saldo)}</td></tr>`;
  });
  html += `</tbody></table>`;

  let containerPrint = document.getElementById('relatorioImpressao');
  containerPrint.innerHTML = html;
  containerPrint.style.display = 'block';
  window.print();
  containerPrint.style.display = 'none';
}

// ==========================================
// GATILHOS DO FILTRO DE ESCALAS (ROTAS)
// ==========================================
function limparFiltroEscalas() {
    let fInicio = document.getElementById('filtroEscalaInicio');
    let fFim = document.getElementById('filtroEscalaFim');
    if (fInicio) fInicio.value = '';
    if (fFim) fFim.value = '';
    renderizarTabelaEscalasSalvas();
}

document.addEventListener('DOMContentLoaded', () => {
    let inputEscalaInicio = document.getElementById('filtroEscalaInicio');
    let inputEscalaFim = document.getElementById('filtroEscalaFim');
    
    if(inputEscalaInicio) inputEscalaInicio.addEventListener('change', renderizarTabelaEscalasSalvas);
    if(inputEscalaFim) inputEscalaFim.addEventListener('change', renderizarTabelaEscalasSalvas);
});

// ==========================================
// MOTOR DE SINCRONIZAÇÃO EM TEMPO REAL (3 segundos)
// ==========================================
setInterval(async () => {
  try {
    let response = await fetch(API_URL + "?t=" + new Date().getTime());
    let dadosAPI = await response.json();
    
    if (dadosAPI["DADOS_SISTEMA_TRANSMARINA"]) {
      let dadosNuvemString = dadosAPI["DADOS_SISTEMA_TRANSMARINA"];
      let bdNuvem = JSON.parse(dadosNuvemString);
      let bdLocalStr = localStorage.getItem('transmarina_bd_cache');
      
      if (bdLocalStr !== dadosNuvemString) {
          localStorage.setItem('transmarina_bd_cache', dadosNuvemString);
          
          if (bdNuvem.depositos) depositos = bdNuvem.depositos;
          if (bdNuvem.escalasDiariasSalvas) escalasDiariasSalvas = bdNuvem.escalasDiariasSalvas;
          if (bdNuvem.balancosSemanais) balancosSemanais = bdNuvem.balancosSemanais;
          if (bdNuvem.todosRegistrosMaster) todosRegistrosMaster = bdNuvem.todosRegistrosMaster;
          if (bdNuvem.historicoEscalas) historicoEscalas = bdNuvem.historicoEscalas;
          if (bdNuvem.proximoIdHistoricoEscala) proximoIdHistoricoEscala = bdNuvem.proximoIdHistoricoEscala;
          if (bdNuvem.depositosEscalas) depositosEscalas = bdNuvem.depositosEscalas;
          if (bdNuvem.proximoIdDepositoEscala) proximoIdDepositoEscala = bdNuvem.proximoIdDepositoEscala;
          
          atualizarTelas(); 
      }
    }
  } catch(e) {}
}, 3000);

carregarDadosLocais();
