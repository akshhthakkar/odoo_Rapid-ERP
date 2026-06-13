/**
 * Validate analytics filter date ranges.
 */
export const validateDateRange = (query) => {
  const { startDate, endDate } = query;

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw { status: 400, message: "Invalid startDate format." };
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      throw { status: 400, message: "Invalid endDate format." };
    }
  }

  if (startDate && endDate) {
    if (new Date(startDate) > new Date(endDate)) {
      throw { status: 400, message: "startDate cannot be after endDate." };
    }
  }
};

/**
 * Validate export request parameters.
 */
export const validateExport = (query) => {
  const { type, format } = query;

  const validTypes = ["sales", "purchase", "inventory", "manufacturing", "audit"];
  const validFormats = ["csv", "pdf", "xlsx"];

  if (!type || !validTypes.includes(type.toLowerCase())) {
    throw { status: 400, message: `Invalid export type. Must be one of: ${validTypes.join(", ")}` };
  }

  if (!format || !validFormats.includes(format.toLowerCase())) {
    throw { status: 400, message: `Invalid export format. Must be one of: ${validFormats.join(", ")}` };
  }
};
