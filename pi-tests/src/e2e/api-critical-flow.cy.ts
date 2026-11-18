describe("SmartProd - Fluxo Crítico E2E de API via cy.request (Cypress)", () => {
  const timestamp = Date.now();
  const apiUrl = Cypress.env("apiUrl") || "http://localhost:5481";

  const user = {
    name: "Cypress API Runner",
    email: `cypress_api_${timestamp}@smartprod.local`,
    senha: "Password123#Secure",
  };

  let token = "";
  let rawMaterialId: number;
  let finishedGoodId: number;
  let orderId: number;

  it("1. Cadastro de usuário via API", () => {
    cy.request({
      method: "POST",
      url: `${apiUrl}/api/v1/Usuario/register`,
      body: user,
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 201) {
        expect(response.body).to.have.property("data");
        expect(response.body.data.user.email).to.eq(user.email);
      }
    });
  });

  it("2. Autenticação e obtenção do Bearer Token", () => {
    cy.request({
      method: "POST",
      url: `${apiUrl}/api/v1/Usuario/login`,
      body: {
        email: user.email,
        senha: user.senha,
      },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200) {
        token = response.body.data.token;
        expect(token).to.be.a("string");
      }
    });
  });

  it("3. Criação de Matéria-Prima (MP)", () => {
    if (!token) return;

    cy.request({
      method: "POST",
      url: `${apiUrl}/api/v1/Produto`,
      headers: { Authorization: `Bearer ${token}` },
      body: {
        code: `MP-${timestamp}`,
        name: `Aço Laminado E2E ${timestamp}`,
        tipo: "MP",
        unit: "KG",
        estoqueAtual: 500,
        estoqueReservado: 0,
        estoqueMínimo: 50,
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      rawMaterialId = response.body.data.id;
      expect(rawMaterialId).to.be.a("number");
    });
  });

  it("4. Criação de Produto Acabado (PA)", () => {
    if (!token) return;

    cy.request({
      method: "POST",
      url: `${apiUrl}/api/v1/Produto`,
      headers: { Authorization: `Bearer ${token}` },
      body: {
        code: `PA-${timestamp}`,
        name: `Caixa Industrial Final ${timestamp}`,
        tipo: "PA",
        unit: "UN",
        estoqueAtual: 0,
        estoqueReservado: 0,
        estoqueMínimo: 10,
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      finishedGoodId = response.body.data.id;
      expect(finishedGoodId).to.be.a("number");
    });
  });

  it("5. Criação de Ordem de Produção (OP)", () => {
    if (!token || !finishedGoodId) return;

    cy.request({
      method: "POST",
      url: `${apiUrl}/api/v1/ProductionOrder`,
      headers: { Authorization: `Bearer ${token}` },
      body: {
        productId: finishedGoodId,
        quantity: 20,
      },
    }).then((response) => {
      expect(response.status).to.eq(201);
      orderId = response.body.data.result.order.id;
      expect(orderId).to.be.a("number");
    });
  });

  it("6. Consulta e validação de status da OP", () => {
    if (!token || !orderId) return;

    cy.request({
      method: "GET",
      url: `${apiUrl}/api/v1/ProductionOrder`,
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      expect(response.status).to.eq(200);
      const orders = response.body.data.orders;
      const created = orders.find((o: any) => o.id === orderId);
      expect(created).to.exist;
      expect(created.status).to.eq("PLANEJADA");
    });
  });
});
