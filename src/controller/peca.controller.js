const pecasService = require('../services/pecas.service');

async function listar(req, res ) {
  try {
    const pecas = await pecasService.listar();
    res.json(pecas);
  } catch (erro) {
    console.error('Erro ao listar peças:', erro.message);
    res.status(500).json({ mensagem: 'Não foi possível listar as peças' });
  }
}
function verificarDadosValidos(pecaAtualizada) {
    if (
        !pecaAtualizada.nome_peca ||
        !pecaAtualizada.sku ||
        !pecaAtualizada.categoria ||
        pecaAtualizada.custo_unitario == null ||
        pecaAtualizada.estoque_atual == null
    ) {
        return false;
    }
    const custo = Number(pecaAtualizada.custo_unitario);
    const estoque = Number(pecaAtualizada.estoque_atual);
    if (
        !Number.isFinite(custo) ||
        custo < 0 ||
        !Number.isInteger(estoque) ||
        estoque < 0
    ) {
        return false;
    }
    return true;
}
async function buscarPorId(req, res) {
  const id = req.params.id;
  try {
    const peca = await pecasService.buscarPorId(id);
    if (peca) {
      res.json(peca);
    } else {
      res.status(404).json({ mensagem: 'Peça não encontrada' });
    }
  } catch (erro) {
    console.error('Erro ao buscar peça por ID:', erro.message);
    res.status(500).json({ mensagem: 'Não foi possível buscar a peça' });
  }
}
async function inserir(req, res) {
  const peca = req.body;
  try {
    await pecasService.inserir(peca);
    res.status(201).json({ mensagem: 'Peça inserida com sucesso' });
  } catch (erro) {
    console.error('Erro ao inserir peça:', erro.message);
    res.status(500).json({ mensagem: 'Não foi possível inserir a peça' });
  }
}
async function deletarPeca(req, res) {
    const id = req.params.id;
    try {
        await pecasService.deletarPeca(id);
        res.status(200).json({ mensagem: 'Peça deletada com sucesso' });
    } catch (erro) {
        console.error('Erro ao deletar peça:', erro.message);
        res.status(500).json({ mensagem: 'Não foi possível deletar a peça' });
    }
}
async function atualizarPeca(req, res) {
    const id = req.params.id;
    const pecaAtualizada = req.body;
    try {
        const pecaExistente = await pecasService.buscarPorId(id);
        if (!pecaExistente) {
            return res.status(404).json({ mensagem: 'Peça não encontrada' });
        }
        if (!verificarDadosValidos(pecaAtualizada)) {
              return res.status(400).json({ mensagem: 'dados inválidos' });
        }
        await pecasService.atualizarPeca(id, pecaAtualizada);
        res.status(200).json({ mensagem: 'Peça atualizada com sucesso' });
    } catch (erro) {
        console.error('Erro ao atualizar peça:', erro.message);
        res.status(500).json({ mensagem: 'Não foi possível atualizar a peça' });
    }
}
module.exports = { listar, buscarPorId, inserir, deletarPeca, atualizarPeca };
