namespace SmartProd.API.Server.Middlewares;

/// <summary>
/// Middleware de Endurecimento de Segurança HTTP (AppSec / OWASP Top 10).
/// Injeta cabeçalhos defensivos contra Clickjacking, MIME-sniffing, XSS e vazamento de referrer.
/// </summary>
public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;

            // Proteção contra Clickjacking
            headers["X-Frame-Options"] = "DENY";

            // Proteção contra MIME-type sniffing
            headers["X-Content-Type-Options"] = "nosniff";

            // Proteção contra XSS em navegadores legados
            headers["X-XSS-Protection"] = "1; mode=block";

            // Política de Referrer restrita para evitar vazamento de dados de URL
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

            // Restrição de APIs de hardware não utilizadas
            headers["Permissions-Policy"] = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

            // Content-Security-Policy (CSP) defensiva
            if (!headers.ContainsKey("Content-Security-Policy"))
            {
                headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' *; frame-ancestors 'none';";
            }

            // HSTS para conexões seguras (1 ano com subdomínios)
            if (context.Request.IsHttps)
            {
                headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            }

            return Task.CompletedTask;
        });

        await _next(context);
    }
}
