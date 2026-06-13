/**
 * Validate Warehouse creation/update payload.
 */
export const validateWarehouse = (data) => {
  const { code, name } = data;

  if (!code || typeof code !== "string" || !code.trim()) {
    throw { status: 400, message: "Warehouse code is required." };
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    throw { status: 400, message: "Warehouse name is required." };
  }

  // Enforce uppercase alphanumeric code format
  const sanitizedCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(sanitizedCode)) {
    throw { status: 400, message: "Warehouse code must contain only letters, numbers, hyphens, or underscores." };
  }
};

/**
 * Validate Stock Transfer payload.
 */
export const validateStockTransfer = (data) => {
  const { sourceWarehouseId, destinationWarehouseId, lines } = data;

  if (!sourceWarehouseId) {
    throw { status: 400, message: "Source warehouse is required." };
  }

  if (!destinationWarehouseId) {
    throw { status: 400, message: "Destination warehouse is required." };
  }

  if (Number(sourceWarehouseId) === Number(destinationWarehouseId)) {
    throw { status: 400, message: "Source and destination warehouses must be different." };
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    throw { status: 400, message: "At least one transfer line is required." };
  }

  lines.forEach((line, index) => {
    const { productId, qty } = line;
    if (!productId) {
      throw { status: 400, message: `Product selection is missing on line ${index + 1}.` };
    }
    const parsedQty = Number(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      throw { status: 400, message: `Quantity must be a positive number on line ${index + 1}.` };
    }
  });
};

/**
 * Validate Inventory Adjustment payload.
 */
export const validateInventoryAdjustment = (data) => {
  const { reason, lines } = data;

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    throw { status: 400, message: "Adjustment reason is required." };
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    throw { status: 400, message: "At least one adjustment line is required." };
  }

  lines.forEach((line, index) => {
    const { productId, qty } = line;
    if (!productId) {
      throw { status: 400, message: `Product selection is missing on line ${index + 1}.` };
    }
    const parsedQty = Number(qty);
    if (isNaN(parsedQty) || parsedQty === 0) {
      throw { status: 400, message: `Adjustment quantity cannot be zero on line ${index + 1}.` };
    }
  });
};
