# Homologação Google Cloud (experimental)

Use um projeto e um banco exclusivos de homologação, sem dados reais. Nada neste
diretório faz push, merge ou deploy de produção automaticamente. A execução de
migrações altera o banco selecionado; rollback de imagem não desfaz o schema.

## Teste local descartável

Com Docker Desktop ativo, executar na raiz:

```bash
docker build -t smartprod-test-api -f SmartProd/SmartProd.Server/Dockerfile SmartProd
docker build -t smartprod-test-web SmartProd/frontend
python deploy/test-local.py
```

O script gera credenciais temporárias em memória, usa apenas portas localhost
15481 e 18080 e remove os containers de teste ao terminar. Não conecta no banco
do Docker Compose principal. Verifica também escrita/leitura, QR em Linux e
reexecução do bootstrap.

## Preparação no Cloud Shell

1. Criar/selecionar projeto de homologação com faturamento habilitado.
2. Habilitar `run.googleapis.com`, `sqladmin.googleapis.com`,
   `artifactregistry.googleapis.com`, `cloudbuild.googleapis.com`,
   `secretmanager.googleapis.com`.
3. Criar repositório Docker `smartprod-repo` em `southamerica-east1`.
4. Criar Cloud SQL PostgreSQL 15 nessa região, banco `SmartProd`, usuário próprio,
   senha aleatória, backups automáticos e recuperação pontual. Para o primeiro
   teste, usar conexão integrada Cloud Run/Cloud SQL via Unix socket, sem liberar
   redes autorizadas de clientes externos. Custos de SQL continuam sem tráfego.
5. Criar conta `smartprod-staging` no projeto, atribuir `roles/cloudsql.client`.
   Criar os segredos abaixo e conceder `roles/secretmanager.secretAccessor` à
   conta **em cada segredo**, com uma versão habilitada `1`:

   | Segredo | Valor |
   | --- | --- |
   | `smartprod-staging-db` | `Host=/cloudsql/PROJECT:REGION:INSTANCE;Database=SmartProd;Username=USUARIO;Password=SENHA;Maximum Pool Size=20` |
   | `smartprod-staging-jwt` | Segredo aleatório com pelo menos 32 bytes |
   | `smartprod-staging-admin-email` | E-mail do administrador de teste |
   | `smartprod-staging-admin-password` | Senha exclusiva com pelo menos 12 caracteres |

   Não colocar valores reais no Git nem em logs. O serviço HTTP recebe somente
   os dois primeiros segredos; o job recebe também os de bootstrap.
6. A conta executora do Cloud Build precisa escrever no Artifact Registry e nos
   logs. Quem executar `staging.sh` precisa administrar Cloud Run e suas políticas
   de invocação, e usar a conta de serviço (`roles/iam.serviceAccountUser`).

## Build e deploy manual

Na raiz desta cópia experimental, sem depender de push ao GitHub:

```bash
export PROJECT_ID=seu-projeto-de-homologacao
export INSTANCE_CONNECTION_NAME="$PROJECT_ID:southamerica-east1:sua-instancia"
export RELEASE=test-$(date -u +%Y%m%d%H%M%S)
gcloud builds submit --project="$PROJECT_ID" --config=cloudbuild.yaml \
  --substitutions="SHORT_SHA=$RELEASE"
bash deploy/staging.sh
```

O job aplica migrações e cria o administrador antes de iniciar a API, e precisa
terminar com sucesso. Não executar deployments concorrentes. As instâncias HTTP
usam `Database__ApplyMigrations=false`. Imagens usam a tag exclusiva da execução;
não reutilizar tags. Manter versões dos segredos fixadas e revisar a rotação.

Depois definir `BACKEND_URL`, `FRONTEND_URL`, `SMOKE_EMAIL`, `SMOKE_PASSWORD` no
ambiente e executar `python3 deploy/smoke.py`. O teste verifica prontidão,
frontend/SPA, bloqueio anônimo, login JWT, leitura de produtos e PDF via Nginx.
Complementar com estoque, ordens, permissões e isolamento de tenants antes de
aprovar produção. Só publicar a branch de teste quando os critérios combinados
forem atendidos; não fazer merge automático.

## Limites desta etapa

- Não há projeto/conta Google autenticados na máquina original. Deploy real,
  IAM, rede Cloud SQL e custos só podem ser validados com esses acessos.
- API pública usa JWT da aplicação. CORS não é mecanismo de autorização.
- Frontend usa `/api` na mesma origem; Nginx usa SNI e Host do upstream HTTPS.
- SignalR e o aplicativo MAUI não fazem parte da aprovação inicial web/API.
  SignalR exige validação de autenticação, isolamento de tenants, proxy WebSocket
  e backplane antes de escalar. MAUI ainda precisa da URL HTTPS configurável e
  validar o envelope de respostas da API antes de uma release móvel.
- Para produção: domínio, alertas, orçamento, restauração de backup testada,
  estratégia de migrações compatíveis e rollback de revisão precisam ser aprovados.
- O workflow CD existente é um placeholder; não foi ativado durante o experimento.

Referências: https://docs.cloud.google.com/sql/docs/postgres/connect-run e
https://docs.cloud.google.com/sdk/gcloud/reference/run/jobs/deploy.
