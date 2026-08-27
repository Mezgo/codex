const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const schema = require("../../schemas/ai-radar-daily-signals.schema.json");

class DailySignalValidationError extends Error {
  constructor(errors) {
    super("Invalid AI Radar daily signals payload");
    this.name = "DailySignalValidationError";
    this.errors = errors;
  }
}

function createDailySignalValidator() {
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

const validate = createDailySignalValidator();

function validateDailySignals(payload) {
  if (!validate(payload)) {
    throw new DailySignalValidationError(validate.errors || []);
  }
  return payload;
}

module.exports = {
  DailySignalValidationError,
  createDailySignalValidator,
  validateDailySignals
};
