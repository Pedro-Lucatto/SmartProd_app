"""Non-destructive staging checks. Credentials come from environment, never arguments."""
import json
import os
import urllib.error
import urllib.request


def check(base, path, expected=200, body=None, token=None, method=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(base.rstrip("/") + path,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status, data = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, data = error.code, error.read()
    if status != expected:
        raise RuntimeError(f"{path}: expected {expected}, received {status}")
    print(f"PASS {path}: {status}")
    return data


if __name__ == "__main__":
    backend = os.environ["BACKEND_URL"]
    frontend = os.environ["FRONTEND_URL"]
    check(backend, "/alive")
    check(backend, "/health/ready")
    assert b"<html" in check(frontend, "/").lower()
    assert b"<html" in check(frontend, "/login").lower()
    check(frontend, "/api/v1/Produto", expected=401)
    login = json.loads(check(frontend, "/api/v1/Usuario/login", body={
        "email": os.environ["SMOKE_EMAIL"], "senha": os.environ["SMOKE_PASSWORD"]}))
    token = login["data"]["token"]
    products = json.loads(check(frontend, "/api/v1/Produto", token=token))
    assert products["success"] and isinstance(products["data"], list)
    pdf = check(frontend, "/api/v1/Relatorio/estoque.pdf", token=token)
    assert pdf.startswith(b"%PDF"), "PDF export did not return a PDF"
    print("PASS staging smoke checks")
