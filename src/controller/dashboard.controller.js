const dashboardService = require('../services/dashboard.service');
async function obterResumo(req, res) {
    try {
        const resumo = await dashboardService.resumoDashboard();
        res.json(resumo);
    } catch (erro) {
        console.error('Erro ao obter resumo do dashboard:', erro.message);
        res.status(500).json({ mensagem: 'Não foi possível obter o resumo do dashboard' });
    }
}