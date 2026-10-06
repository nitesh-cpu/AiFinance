export function validateEnvironment() {
  const missing = [];
  if (!process.env.MONGO_URI) missing.push('MONGO_URI');
  if (!isStrongJwtSecret(process.env.JWT_SECRET)) {
    missing.push('JWT_SECRET (at least 32 characters)');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
    missing.push('CLIENT_URL');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.ML_SERVICE_URL) {
    missing.push('ML_SERVICE_URL');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.ML_API_KEY) {
    missing.push('ML_API_KEY');
  }
  if (process.env.NODE_ENV === 'production' &&
    (process.env.ML_API_KEY?.length || 0) < 32) {
    missing.push('ML_API_KEY (at least 32 characters)');
  }
  if (process.env.PORT !== undefined &&
    (!/^\d+$/.test(process.env.PORT) || Number(process.env.PORT) < 1 || Number(process.env.PORT) > 65535)) {
    missing.push('PORT (integer between 1 and 65535)');
  }

  if (missing.length) {
    throw new Error(`Invalid environment configuration: ${missing.join(', ')}`);
  }
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!isStrongJwtSecret(secret)) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

function isStrongJwtSecret(secret) {
  return typeof secret === 'string' &&
    secret.length >= 32 &&
    !/^(change|replace|your|spendsense)[_-]/i.test(secret);
}
