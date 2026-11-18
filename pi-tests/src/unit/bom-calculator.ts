/**
 * SmartProd - Regra de Negócio Industrial (BOM & Estoque)
 * Módulo para cálculo de explosão de materiais e validação de suficiência de estoque.
 */

export interface BomItem {
  materialId: number;
  materialName: string;
  quantityPerUnit: number;
}

export interface InventoryItem {
  productId: number;
  availableQuantity: number;
}

export interface BomRequirement {
  materialId: number;
  materialName: string;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
  hasSufficientStock: boolean;
}

export interface BomExplosionResult {
  orderQuantity: number;
  hasSufficientStock: boolean;
  totalComponents: number;
  items: BomRequirement[];
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Calcula a explosão de materiais necessários para uma Ordem de Produção (OP)
 * e avalia a disponibilidade no estoque da fábrica.
 */
export function calculateBomExplosion(
  orderQuantity: number,
  bomItems: BomItem[],
  inventory: InventoryItem[]
): BomExplosionResult {
  if (typeof orderQuantity !== "number" || isNaN(orderQuantity) || orderQuantity <= 0) {
    throw new ValidationError("A quantidade da ordem deve ser um número maior que zero.");
  }

  if (!Array.isArray(bomItems) || bomItems.length === 0) {
    throw new ValidationError("A estrutura do produto (BOM) não possui materiais cadastrados.");
  }

  const inventoryMap = new Map<number, number>(
    inventory.map((inv) => [inv.productId, Math.max(0, inv.availableQuantity)])
  );

  let allComponentsAvailable = true;

  const requirements: BomRequirement[] = bomItems.map((item) => {
    if (item.quantityPerUnit <= 0) {
      throw new ValidationError(
        `Quantidade por unidade inválida para o componente ${item.materialName}. Deve ser maior que zero.`
      );
    }

    const required = Number((item.quantityPerUnit * orderQuantity).toFixed(4));
    const available = Number((inventoryMap.get(item.materialId) ?? 0).toFixed(4));
    const missing = Number(Math.max(0, required - available).toFixed(4));
    const sufficient = available >= required;

    if (!sufficient) {
      allComponentsAvailable = false;
    }

    return {
      materialId: item.materialId,
      materialName: item.materialName,
      requiredQuantity: required,
      availableQuantity: available,
      missingQuantity: missing,
      hasSufficientStock: sufficient,
    };
  });

  return {
    orderQuantity,
    hasSufficientStock: allComponentsAvailable,
    totalComponents: requirements.length,
    items: requirements,
  };
}
