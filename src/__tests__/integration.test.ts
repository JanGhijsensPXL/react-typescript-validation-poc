import { describe, it, expect } from 'vitest';

/**
 * Integration tests verifying that the POC can make requests
 * to the MSW mock server and parse responses correctly.
 * 
 * This ensures the POC accurately simulates the backend DTO shapes
 * (PascalCase, optional fields, string IDs where applicable).
 */

describe('Backend Integration (MSW)', () => {
  it('should fetch JWT token claims with backend DTO shape (string IDs)', async () => {
    const response = await fetch(
      'https://vasamaapi-ebhbb2ejbddsfphj.swedencentral-01.azurewebsites.net/api/authentication/getaccountaccesstokenclaims'
    );
    
    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    
    // Verify backend shape: PascalCase, string IDs
    expect(data).toHaveProperty('AccountAccessId');
    expect(typeof data.AccountAccessId).toBe('string');
    expect(data).toHaveProperty('Username');
    expect(data).toHaveProperty('RHCooperativeNum');
    expect(typeof data.RHCooperativeNum).toBe('string');
    expect(data).toHaveProperty('Permissions');
    expect(Array.isArray(data.Permissions)).toBe(true);
  });

  it('should login and return access token', async () => {
    const response = await fetch(
      'https://vasamaapi-ebhbb2ejbddsfphj.swedencentral-01.azurewebsites.net/api/authentication/useraccount/login/12',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: 'demo', Password: 'secret' }),
      }
    );
    
    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    
    // Verify response shape
    expect(data).toHaveProperty('accessToken');
    expect(typeof data.accessToken).toBe('string');
    expect(data.accessToken).toMatch(/^eyJ/); // JWT format
  });

  it('should reject invalid login', async () => {
    const response = await fetch(
      'https://vasamaapi-ebhbb2ejbddsfphj.swedencentral-01.azurewebsites.net/api/authentication/useraccount/login/12',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: 'invalid', Password: 'invalid' }),
      }
    );
    
    expect(response.status).toBe(401);
  });

  it('should get login RH cooperative numbers with backend DTO shape', async () => {
    const response = await fetch(
      'https://vasamaapi-ebhbb2ejbddsfphj.swedencentral-01.azurewebsites.net/api/authentication/useraccount/GetLoginRHCooperativeNums',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: 'demo', Password: 'secret' }),
      }
    );
    
    expect(response.status).toBe(200);
    const data = await response.json() as Record<string, unknown>;
    
    // Verify backend DTO shape: PascalCase, array of RHCooperativeNameNumDto
    expect(data).toHaveProperty('RHCooperatives');
    expect(Array.isArray(data.RHCooperatives)).toBe(true);
    
    const rhcs = data.RHCooperatives as Array<Record<string, unknown>>;
    if (rhcs.length > 0) {
      expect(rhcs[0]).toHaveProperty('RHCooperativeNum');
      expect(typeof rhcs[0].RHCooperativeNum).toBe('number');
      expect(rhcs[0]).toHaveProperty('Name');
      expect(typeof rhcs[0].Name).toBe('string');
    }
    
    // PreferredRHCooperativeNum is optional in backend
    if (data.PreferredRHCooperativeNum !== undefined) {
      expect(typeof data.PreferredRHCooperativeNum).toBe('number');
    }
  });

  it('should fetch RH cooperatives with backend DTO shape (PascalCase)', async () => {
    const response = await fetch(
      'https://vasamaapi-ebhbb2ejbddsfphj.swedencentral-01.azurewebsites.net/api/liveporo/GetUserRHCooperative'
    );
    
    expect(response.status).toBe(200);
    const data = await response.json() as Array<Record<string, unknown>>;
    
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      const rhc = data[0];
      // Verify backend PascalCase property names
      expect(rhc).toHaveProperty('RHCooperativeNum');
      expect(rhc).toHaveProperty('Name');
      expect(rhc).toHaveProperty('BusinessId');
      expect(rhc).toHaveProperty('RHDistrict');
      expect(rhc).toHaveProperty('Municipality');
      expect(rhc).toHaveProperty('HeadOfRHC');
      expect(rhc).toHaveProperty('Street');
      expect(rhc).toHaveProperty('PostCode');
      expect(rhc).toHaveProperty('City');
      expect(rhc).toHaveProperty('Accountant');
    }
  });

  it('should fetch slaughter events with backend DTO shape', async () => {
    const response = await fetch(
      'https://vasamaapi-ebhbb2ejbddsfphj.swedencentral-01.azurewebsites.net/api/liveporo/GetAllSlaughterEvents'
    );
    
    expect(response.status).toBe(200);
    const data = await response.json() as Array<Record<string, unknown>>;
    
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      const event = data[0];
      expect(event).toHaveProperty('Id');
      expect(event).toHaveProperty('RHCooperativeNum');
      expect(event).toHaveProperty('EventId');
      expect(event).toHaveProperty('EventDate');
      expect(event).toHaveProperty('Location');
      expect(event).toHaveProperty('IsActive');
    }
  });

  it('should return 404 for unknown endpoint', async () => {
    const response = await fetch(
      'https://vasamaapi-ebhbb2ejbddsfphj.swedencentral-01.azurewebsites.net/api/unknown/endpoint'
    );
    
    expect(response.status).toBe(404);
  });
});
