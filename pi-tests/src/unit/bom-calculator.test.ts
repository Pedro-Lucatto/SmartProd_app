import {
  calculateBomExplosion,
  ValidationError,
  BomItem,
  InventoryItem,
} from "./bom-calculator";

describe("SmartProd - Testes Unitários de Regra de Negócio (Jest)", () => {
  const sampleBom: BomItem[] = [
    { materialId: 101, materialName: "Chapa de Aço", quantityPerUnit: 2.5 },
    { materialId: 102, materialName: "Parafuso Industrial", quantityPerUnit: 8.0 },
    { materialId: 103, materialName: "Tinta Primer (L)", quantityPerUnit: 0.5 },
  ];

  describe("Cenários de Sucesso", () => {
    it("deve calcular a explosão de materiais corretamente quando há estoque suficiente", () => {
      const orderQuantity = 10;
      const inventory: InventoryItem[] = [
        { productId: 101, availableQuantity: 30 }, // Precisa de 25
        { productId: 102, availableQuantity: 100 }, // Precisa de 80
        { productId: 103, availableQuantity: 10 }, // Precisa de 5
      ];

      const result = calculateBomExplosion(orderQuantity, sampleBom, inventory);

      expect(result.orderQuantity).toBe(10);
      expect(result.totalComponents).toBe(3);
      expect(result.hasSufficientStock).toBe(true);

      const chapa = result.items.find((i) => i.materialId === 101);
      expect(chapa).toBeDefined();
      expect(chapa?.requiredQuantity).toBe(25.0);
      expect(chapa?.missingQuantity).toBe(0);
      expect(chapa?.hasSufficientStock).toBe(true);

      const parafuso = result.items.find((i) => i.materialId === 102);
      expect(parafuso?.requiredQuantity).toBe(80.0);
      expect(parafuso?.hasSufficientStock).toBe(true);
    });

    it("deve sinalizar falta de estoque quando algum componente estiver com saldo insuficiente", () => {
      const orderQuantity = 20;
      const inventory: InventoryItem[] = [
        { productId: 101, availableQuantity: 40 }, // Precisa de 50 -> Faltam 10
        { productId: 102, availableQuantity: 200 }, // Precisa de 160 -> OK
        { productId: 103, availableQuantity: 2 }, // Precisa de 10 -> Faltam 8
      ];

      const result = calculateBomExplosion(orderQuantity, sampleBom, inventory);

      expect(result.hasSufficientStock).toBe(false);

      const chapa = result.items.find((i) => i.materialId === 101);
      expect(chapa?.requiredQuantity).toBe(50);
      expect(chapa?.availableQuantity).toBe(40);
      expect(chapa?.missingQuantity).toBe(10);
      expect(chapa?.hasSufficientStock).toBe(false);

      const tinta = result.items.find((i) => i.materialId === 103);
      expect(tinta?.missingQuantity).toBe(8);
      expect(tinta?.hasSufficientStock).toBe(false);
    });
  });

  describe("Cenários de Validação e Erro", () => {
    it("deve rejeitar ordens de produção com quantidade zero", () => {
      expect(() => calculateBomExplosion(0, sampleBom, [])).toThrow(ValidationError);
      expect(() => calculateBomExplosion(0, sampleBom, [])).toThrow(
        "A quantidade da ordem deve ser um número maior que zero."
      );
    });

    it("deve rejeitar ordens de produção com quantidade negativa", () => {
      expect(() => calculateBomExplosion(-5, sampleBom, [])).toThrow(ValidationError);
    });

    it("deve rejeitar produtos com estrutura BOM vazia", () => {
      expect(() => calculateBomExplosion(10, [], [])).toThrow(ValidationError);
      expect(() => calculateBomExplosion(10, [], [])).toThrow(
        "A estrutura do produto (BOM) não possui materiais cadastrados."
      );
    });

    it("deve rejeitar itens de BOM com quantidade por unidade zero ou negativa", () => {
      const invalidBom: BomItem[] = [
        { materialId: 999, materialName: "Componente Inválido", quantityPerUnit: -1 },
      ];
      expect(() => calculateBomExplosion(10, invalidBom, [])).toThrow(ValidationError);
    });
  });
});
