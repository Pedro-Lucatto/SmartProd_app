using System.ComponentModel.DataAnnotations;

namespace SmartProd.API.Server.DTOs
{
    public class RegisterDto
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string? Name { get; set; }
        [Required]
        [EmailAddress]
        [StringLength(254)]
        public string? Email { get; set; }
        [Required]
        [StringLength(128, MinimumLength = 8, ErrorMessage = "A senha deve ter no mínimo 8 caracteres.")]
        [RegularExpression(@"^(?=.*[a-zA-Z])(?=.*\d).+$", ErrorMessage = "A senha deve conter pelo menos uma letra e um número.")]
        public string? Senha { get; set; }
        [StringLength(100)]
        public string? Department { get; set; }
    }
}
