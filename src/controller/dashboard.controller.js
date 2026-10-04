const dashboardService = require('../services/dashboard.service');

async function resumo(req, res, next) {
  try {
    res.json(await dashboardService.resumoDashboard(req.query));
  } catch (erro) {
    next(erro);
  }
}
module.exports = { resumo };
