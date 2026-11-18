using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SmartProd.API.Server.Hubs;

/// <summary>
/// Hub SignalR para telemetria e atualizações de chão de fábrica em tempo real (Indústria 4.0).
/// Transmite eventos de conclusão de ordens, baixas de estoque e telemetria de máquinas para painéis e dashboards.
/// </summary>
[Authorize]
public class ProductionHub : Hub
{
    public async Task JoinWorkCenterGroup(string workCenterCode)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"WorkCenter_{workCenterCode}");
    }

    public async Task LeaveWorkCenterGroup(string workCenterCode)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"WorkCenter_{workCenterCode}");
    }

    public async Task BroadcastProductionAlert(string machineCode, string alertMessage)
    {
        await Clients.All.SendAsync("ReceiveProductionAlert", new
        {
            machineCode,
            alertMessage,
            timestamp = DateTime.UtcNow
        });
    }
}
