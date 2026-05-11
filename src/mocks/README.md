# Backend Integration: MSW Mock Server

## Overview

The POC now includes a **Mock Service Worker (MSW)** setup that simulates VasamaAPI endpoints and responses with **backend-accurate DTOs**.

## What's Included

### 1. Mock Handlers (`src/mocks/handlers.ts`)
- **Endpoints**: Authentication (login, token claims), RH cooperatives, slaughter events, roundup sites, locations, tag colors
- **DTO Shapes**: All responses use **PascalCase** properties matching the backend exactly
- **Type Quirks**: 
  - JWT claims return **string IDs** (e.g., `AccountAccessId: "123"`, `RHCooperativeNum: "12"`)
  - Optional fields (e.g., `PreferredRHCooperativeNum` can be null)
  - Proper HTTP status codes and error handling

### 2. MSW Server Setup (`src/mocks/server.ts`)
- Configures MSW for Node environment (Vitest)
- Auto-intercepts HTTP requests during tests

### 3. Test Wiring (`src/setupTests.ts`)
- Automatically enables msw before all tests
- Resets handlers between tests
- Cleans up after test suite

### 4. Integration Tests (`src/__tests__/integration.test.ts`)
- Verifies backend DTO shapes (PascalCase, string IDs, optional fields)
- Confirms HTTP status codes and error handling
- Validates that frontend code can parse backend responses

### 5. Mapper Examples (`src/mappers/backendDtoMappers.ts`)
- Shows how to convert backend DTOs (PascalCase, string IDs) → frontend models (camelCase, typed IDs)
- Includes mappers for User, RH Cooperative, and Login Options

## Why This Matters

The backend (VasamaAPI) uses:
- **PascalCase** property names (`RHCooperativeNum`, `AccountAccessId`)
- **String IDs** in JWT claims (despite being numeric in storage)
- **Optional/nullable** fields in some DTOs

Without accurate simulation, the frontend code can silently fail when deployed against the real backend. MSW + these handlers catch those issues **before production**.

## Running Tests

```bash
npm test
```

All tests (including 7 new integration tests) verify that the mock server correctly represents the backend API contract.

## Adding New Endpoints

To add a new backend endpoint to the mock:

1. Open `src/mocks/handlers.ts`
2. Add a new `http.get()` or `http.post()` handler
3. Return backend-shaped DTO using PascalCase and nullable fields
4. Add a corresponding integration test in `src/__tests__/integration.test.ts`

Example:
```typescript
http.get(`${BASE_URL}/liveporo/MyEndpoint`, () => {
  return HttpResponse.json({
    Id: 1,
    Name: 'Example',
    // PascalCase properties matching backend DTO
  });
});
```

## Future Enhancements

- Add more endpoints (UserAccount CRUD, audit logs, etc.)
- Simulate rate limiting headers
- Add request body validation in handlers
- Include response envelope patterns
- Add handler customization for test-specific scenarios (e.g., error injection)
