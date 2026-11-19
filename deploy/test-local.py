"""Run after building smartprod-test-api and smartprod-test-web Docker images."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time
import urllib.request
from smoke import check

root = Path(__file__).resolve().parents[1]
env = os.environ.copy()
env.update(TEST_DB_PASSWORD=secrets.token_hex(24), TEST_JWT_SECRET=secrets.token_hex(32),
           SMOKE_EMAIL="admin@staging.local", SMOKE_PASSWORD=secrets.token_urlsafe(24),
           BACKEND_URL="http://127.0.0.1:15481", FRONTEND_URL="http://127.0.0.1:18080")
compose = ["docker", "compose", "-p", "smartprod-cloud-test", "-f", "deploy/compose.test.yaml"]


def run(*args):
    subprocess.run([*compose, *args], cwd=root, env=env, check=True)


try:
    run("up", "-d")
    for attempt in range(60):
        try:
            with urllib.request.urlopen(env["BACKEND_URL"] + "/health/ready", timeout=2) as r:
                if r.status == 200:
                    break
        except Exception:
            time.sleep(1)
    else:
        raise RuntimeError("API did not become ready")
    subprocess.run([sys.executable, "deploy/smoke.py"], cwd=root, env=env, check=True)
    base = env["FRONTEND_URL"]
    login = json.loads(check(base, "/api/v1/Usuario/login", body={
        "email": env["SMOKE_EMAIL"], "senha": env["SMOKE_PASSWORD"]}))
    token = login["data"]["token"]
    code = "CLOUD-" + secrets.token_hex(5)
    created = json.loads(check(base, "/api/v1/Produto", expected=201, token=token, body={
        "code": code, "name": "Disposable Cloud Test", "tipo": "MP", "unit": "kg",
        "estoqueAtual": 10}))
    product_id = created["data"]["id"]
    product = json.loads(check(base, f"/api/v1/Produto/{product_id}", token=token))
    assert product["data"]["code"] == code
    audit_count = subprocess.check_output([*compose, "exec", "-T", "db", "psql",
        "-U", "smartprod", "-d", "SmartProd", "-tAc",
        f'''SELECT count(*) FROM "AuditEvents" WHERE "EntityType" = 'Produto' AND "EntityId" = '{int(product_id)}';'''],
        cwd=root, env=env, text=True)
    assert int(audit_count.strip()) == 1, "Product audit must reference the generated database ID"
    check(base, f"/api/v1/Produto/{product_id}", token=token, method="PUT", body={
        "code": code, "name": "Updated Disposable Cloud Test", "tipo": "MP", "unit": "kg",
        "estoqueAtual": 8})
    updated = json.loads(check(base, f"/api/v1/Produto/{product_id}", token=token))
    assert updated["data"]["estoqueAtual"] == 8
    png = check(base, f"/api/v1/Produto/{code}/qrcode", token=token)
    assert png.startswith(b"\x89PNG")
    # A repeated job must finish successfully, preserving the initial admin/product.
    run("run", "--rm", "migrate")
    check(base, f"/api/v1/Produto/{product_id}", token=token)
    print("PASS PostgreSQL migrations, repeated bootstrap, authenticated write/read and QR on Linux")
except Exception:
    run("logs", "--tail", "30", "migrate", "backend", "frontend")
    raise
finally:
    # Only this test project's disposable containers/networks/volumes are removed.
    run("down", "--volumes")
