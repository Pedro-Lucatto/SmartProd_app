describe("SmartProd - Fluxo Crítico E2E Web (Cypress)", () => {
  const timestamp = Date.now();
  const testUser = {
    name: "Operador Cypress E2E",
    email: `cypress_user_${timestamp}@smartprod.local`,
    password: "Password123#Secure",
  };

  it("deve carregar a página de login com sucesso", () => {
    cy.visit("/login");
    cy.contains("SmartProd").should("be.visible");
    cy.get("#email").should("be.visible");
    cy.get("#password").should("be.visible");
    cy.contains("button", "Entrar").should("be.visible");
  });

  it("deve realizar o fluxo completo de cadastro com dados dinâmicos para prevenir duplicidade", () => {
    cy.visit("/register");
    cy.contains("Crie sua conta").should("be.visible");

    // Preenche formulário com identificadores únicos baseados em timestamp
    cy.get("#name").type(testUser.name);
    cy.get("#email").type(testUser.email);
    cy.get("#password").type(testUser.password);
    cy.get("#passwordConfirm").type(testUser.password);

    cy.contains("button", "Registrar").click();

    // Valida mensagem de sucesso de registro
    cy.contains("Cadastro realizado com sucesso").should("be.visible");
  });

  it("deve realizar login com a conta recém-criada e acessar a área interna", () => {
    cy.visit("/login");

    cy.get("#email").type(testUser.email);
    cy.get("#password").type(testUser.password);
    cy.contains("button", "Entrar").click();

    // Valida transição para a área autenticada
    cy.url().should("not.include", "/login");
  });
});
