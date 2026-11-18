using System.ComponentModel.DataAnnotations;

namespace SmartProd.API.Server.DTOs
{
    public class OrdemProducaoCreateDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "ProductId deve ser um id válido.")]
        public int ProductId { get; set; }
        public int UsuarioId { get; set; }
        [Range(double.Epsilon, double.MaxValue, ErrorMessage = "A quantidade deve ser maior que zero.")]
        public double Quantity { get; set; }
    }
}
