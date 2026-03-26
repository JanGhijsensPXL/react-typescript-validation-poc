import Ajv, { type JSONSchemaType, type ErrorObject } from 'ajv';
import type { SlaughterRecord } from '../types/slaughterRecord';

type ValidationResult = {
  passed: boolean;
  errors: string[];
};

const EAR_TAG_ID_PATTERN = '^SL-\\d{4}-\\d{3,6}$';

const slaughterRecordAjvSchema: JSONSchemaType<SlaughterRecord> = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'herderName',
    'type',
    'slaughterDate',
    'animalCount',
    'totalWeightKg',
    'slaughterhouseId',
    'veterinarianApproved',
  ],
  properties: {
    id: { type: 'string', pattern: EAR_TAG_ID_PATTERN },
    herderName: { type: 'string', minLength: 2, maxLength: 100 },
    type: {
      type: 'string',
      enum: ['male', 'female', 'child', 'steralised male'],
    },
    slaughterDate: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    },
    animalCount: { type: 'integer', minimum: 1, maximum: 10000 },
    totalWeightKg: { type: 'number', exclusiveMinimum: 0, maximum: 1_000_000 },
    slaughterhouseId: { type: 'string', minLength: 1 },
    veterinarianApproved: { type: 'boolean' },
  },
};

const ajv = new Ajv({ allErrors: true, strict: true });
const validateRecord = ajv.compile(slaughterRecordAjvSchema);

function isValidCalendarDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function isNotFutureDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return date.getTime() <= todayUtc;
}

function pathFromError(error: ErrorObject): string {
  if (error.keyword === 'required') {
    const missing = (error.params as { missingProperty: string }).missingProperty;
    return missing;
  }

  if (error.keyword === 'additionalProperties') {
    const extra = (error.params as { additionalProperty: string }).additionalProperty;
    return extra;
  }

  const path = error.instancePath.startsWith('/')
    ? error.instancePath.slice(1).replaceAll('/', '.')
    : error.instancePath;
  return path || 'root';
}

function messageFromError(error: ErrorObject): string {
  return error.message ?? 'Invalid value';
}

export function validateWithAjv(data: unknown): ValidationResult {
  const ok = validateRecord(data);
  if (!ok) {
    const errors = (validateRecord.errors ?? []).map(
      (error) => `${pathFromError(error)}: ${messageFromError(error)}`,
    );
    return {
      passed: false,
      errors,
    };
  }

  if (!isValidCalendarDate(data.slaughterDate)) {
    return {
      passed: false,
      errors: ['slaughterDate: Date must be a valid calendar date'],
    };
  }

  if (!isNotFutureDate(data.slaughterDate)) {
    return {
      passed: false,
      errors: ['slaughterDate: Date cannot be in the future'],
    };
  }

  return { passed: true, errors: [] };
}

export { slaughterRecordAjvSchema };
