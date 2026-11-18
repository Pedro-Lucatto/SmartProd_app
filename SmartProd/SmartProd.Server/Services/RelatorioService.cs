using Microsoft.EntityFrameworkCore;
using SmartProd.API.Server.Data;
using SmartProd.API.Server.Enum;

namespace SmartProd.API.Server.Services
{
    public class RelatorioService
    {
        private readonly AppDbContext _context;
        public RelatorioService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<object> GetRelatorioProducao(DateTime dataInicial, DateTime dataFinal)
        {
            var start = dataInicial.Date;
            var end = dataFinal.Date.AddHours(23).AddMinutes(59).AddSeconds(59);

            // TOTAL PLANEJADO
            var planejado = await _context.OrdensProducao
                .Where(po => po.CreatedAt >= start && po.CreatedAt <= end)
                .SumAsync(po => (double?)po.Quantity) ?? 0;

            // TOTAL REAL PRODUZIDO
            var produzido = await _context.OrdensProducao
                .Where(po => po.FinishedAt >= start && po.FinishedAt <= end)
                .SumAsync(po => (double?)po.Produced) ?? 0;

            var eficiencia = planejado == 0 ? 0 : (int)Math.Round((produzido / planejado) * 100);

            // PRODUÇÃO POR PRODUTO
            var producaoPorProduto = await _context.OrdensProducao
                .Where(po => po.FinishedAt >= start && po.FinishedAt <= end)
                .GroupBy(po => po.ProductId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    TotalProduzido = g.Sum(x => (double?)x.Produced) ?? 0
                })
                .ToListAsync();

            // Busca nome dos produtos de forma consolidada e thread-safe (sem concorrência em DbContext)
            var productIds = producaoPorProduto.Select(p => p.ProductId).Distinct().ToList();
            var productMap = await _context.Produtos
                .AsNoTracking()
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Name);

            var resultado = producaoPorProduto.Select(p => new
            {
                productId = p.ProductId,
                nome = productMap.GetValueOrDefault(p.ProductId, "Desconhecido"),
                totalProduzido = p.TotalProduzido
            }).ToList();

            return new
            {
                totalPlanejado = planejado,
                totalProduzido = produzido,
                eficiencia,
                producaoPorProduto = resultado
            };
        }

        // Método comentado - Stocks DbSet não existe no contexto
        public async Task<IEnumerable<object>> GetRelatorioEstoque()
         {
            // Supondo um estoque "snapshot" (ajuste se tiver histórico por data)
            var itensEstoque = await _context.Estoque
                .Include(e => e.Produto)
                 .ToListAsync();

            return itensEstoque.Select(e => new
             {
                productId = e.ProductId,
                produto = e.Produto?.Name ?? "Desconhecido",
                quantidade = e.Quantity,
                unidade = e.Unit ?? "UN"
             });
         }

        public async Task<IEnumerable<object>> GetRelatorioConsumoMP(DateTime dataInicial, DateTime dataFinal)
        {
            var start = dataInicial.Date;
            var end = dataFinal.Date.AddHours(23).AddMinutes(59).AddSeconds(59);

            var consumo = await _context.Movimentacoes
                .Where(m =>
                    m.Tipo == TipoMovimentacao.SAIDA &&
                    m.CreatedAt >= start && m.CreatedAt <= end)
                .GroupBy(m => m.ProductId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    TotalConsumido = g.Sum(x => (double?)x.Quantity) ?? 0
                })
                .ToListAsync();

            var consumoProductIds = consumo.Select(c => c.ProductId).Distinct().ToList();
            var consumoProductMap = await _context.Produtos
                .AsNoTracking()
                .Where(p => consumoProductIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Name);

            var resultado = consumo.Select(item => new
            {
                productId = item.ProductId,
                produto = consumoProductMap.GetValueOrDefault(item.ProductId, "Desconhecido"),
                totalConsumido = item.TotalConsumido
            }).ToList();

            return resultado;
        }

        // Método comentado - Sales DbSet não existe no contexto
        public async Task<IEnumerable<object>> GetRelatorioVendas(DateTime dataInicial, DateTime dataFinal)
         {
             var start = dataInicial.Date;
             var end = dataFinal.Date.AddHours(23).AddMinutes(59).AddSeconds(59);

             var vendas = await _context.Vendas
                .Where(s => s.CreatedAt >= start && s.CreatedAt <= end)
                .GroupBy(s => s.ProductId)
                .Select(g => new
               {
                    ProductId = g.Key,
                    QuantidadeVendida = g.Sum(x => (double?)x.Quantity) ?? 0,
                    TotalFaturado = g.Sum(x => (double?)x.TotalValue) ?? 0
                })
               .ToListAsync();

            var vendasProductIds = vendas.Select(v => v.ProductId).Distinct().ToList();
            var vendasProductMap = await _context.Produtos
                .AsNoTracking()
                .Where(p => vendasProductIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, p => p.Name);

            var resultado = vendas.Select(item => new
            {
                productId = item.ProductId,
                produto = vendasProductMap.GetValueOrDefault(item.ProductId, "Desconhecido"),
                quantidadeVendida = item.QuantidadeVendida,
                totalFaturado = item.TotalFaturado
            }).ToList();

            return resultado;
        }
    }
}
