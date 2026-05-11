import { http, HttpResponse } from 'msw';

const BASE_URL = 'https://vasamaapi-ebhbb2ejbddsfphj.swedencentral-01.azurewebsites.net/api';

/**
 * MSW Handlers simulating VasamaAPI backend responses.
 * Uses backend-shaped DTOs with PascalCase properties and nullable fields.
 */
export const handlers = [
  // POST /authentication/useraccount/login/{rhCooperativeNum}
  // Returns: { accessToken: string }
  http.post(`${BASE_URL}/authentication/useraccount/login/:rhCooperativeNum`, async ({ request, params }) => {
    const body = await request.json() as Record<string, unknown>;
    const { Username, Password } = body;

    // Simulate invalid credentials
    if (Username === 'invalid' || Password === 'invalid') {
      return HttpResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Success: return accessToken
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBY2NvdW50QWNjZXNzSWQiOiIxMjMiLCJVc2VybmFtZSI6ImRlbW8iLCJSSENvb3BlcmF0aXZlTnVtIjoiMTIiLCJleHAiOjk5OTk5OTk5OTl9.mock';
    return HttpResponse.json(
      { accessToken: mockToken },
      { 
        status: 200,
        headers: {
          'Set-Cookie': `refreshToken=mock-refresh-token-xyz; HttpOnly; Secure; SameSite=None; Path=/`,
        }
      }
    );
  }),

  // POST /authentication/useraccount/GetLoginRHCooperativeNums
  // Returns: LoginRHCooperativeNumResponse with backend DTO shape
  http.post(`${BASE_URL}/authentication/useraccount/GetLoginRHCooperativeNums`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const { Username } = body;

    if (!Username) {
      return HttpResponse.json(
        { error: 'Username required' },
        { status: 400 }
      );
    }

    // Backend response shape: RHCooperatives is an array of RHCooperativeNameNumDto
    return HttpResponse.json({
      RHCooperatives: [
        { RHCooperativeNum: 1, Name: 'Test RH Cooperative 1' },
        { RHCooperativeNum: 2, Name: 'Test RH Cooperative 2' },
      ],
      PreferredRHCooperativeNum: 1, // nullable in backend
    });
  }),

  // GET /authentication/getaccountaccesstokenclaims
  // Returns: JwtTokenClaimsDto with string IDs (backend quirk)
  http.get(`${BASE_URL}/authentication/getaccountaccesstokenclaims`, () => {
    // Backend returns string IDs in claims (from JWT parsing)
    return HttpResponse.json({
      AccountAccessId: '123',
      Username: 'demo',
      RHCooperativeNum: '12',
      Permissions: ['read:slaughter', 'write:roundup'],
    });
  }),

  // POST /authentication/refreshtokens
  // Returns: { accessToken: string }
  http.post(`${BASE_URL}/authentication/refreshtokens`, () => {
    const newAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuZXciOiJ0cnVlIiwiZXhwIjo5OTk5OTk5OTk5fQ.mock';
    return HttpResponse.json(
      { accessToken: newAccessToken },
      {
        status: 200,
        headers: {
          'Set-Cookie': `refreshToken=mock-refresh-token-new-abc; HttpOnly; Secure; SameSite=None; Path=/`,
        }
      }
    );
  }),

  // GET /liveporo/GetUserRHCooperative
  // Returns: array of RHCooperativeDto with PascalCase
  http.get(`${BASE_URL}/liveporo/GetUserRHCooperative`, () => {
    return HttpResponse.json([
      {
        RHCooperativeNum: 12,
        Name: 'Test Cooperative',
        BusinessId: 'FI12345678',
        RHDistrict: 'Northern District',
        Municipality: 'Ivalo',
        HeadOfRHC: 'John Doe',
        Street: 'Reindeerstreet 1',
        PostCode: '99800',
        City: 'Ivalo',
        Accountant: 'Jane Smith',
      },
    ]);
  }),

  // POST /liveporo/SlaughterEvent_Add
  // Simulates adding a slaughter event
  http.post(`${BASE_URL}/liveporo/SlaughterEvent_Add`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    
    if (!body || Object.keys(body).length === 0) {
      return HttpResponse.json(
        { error: 'Bad data' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ success: true });
  }),

  // GET /liveporo/GetAllSlaughterEvents
  // Returns: array of SlaughterEventDto with PascalCase
  http.get(`${BASE_URL}/liveporo/GetAllSlaughterEvents`, () => {
    return HttpResponse.json([
      {
        Id: 1,
        RHCooperativeNum: 12,
        EventId: 'EVT-2026-001',
        EventDate: '2026-04-30',
        Location: 'Slaughterhouse A',
        IsActive: true,
      },
    ]);
  }),

  // GET /liveporo/GetAllRoundupSites
  // Returns: array of RoundupSiteDto with PascalCase
  http.get(`${BASE_URL}/liveporo/GetAllRoundupSites`, () => {
    return HttpResponse.json([
      {
        Id: 1,
        RHCooperativeNum: 12,
        Name: 'Site A',
        Latitude: 66.5,
        Longitude: 25.5,
        IsActive: true,
      },
    ]);
  }),

  // GET /liveporo/GetAllLocationDatas
  // Returns: array of LocationDto with PascalCase
  http.get(`${BASE_URL}/liveporo/GetAllLocationDatas`, () => {
    return HttpResponse.json([
      {
        Id: 1,
        RHCooperativeNum: 12,
        LocationName: 'North Pasture',
        Latitude: 66.5,
        Longitude: 25.5,
      },
    ]);
  }),

  // GET /liveporo/GetAllTagColors
  // Returns: array of TagColorDto with PascalCase
  http.get(`${BASE_URL}/liveporo/GetAllTagColors`, () => {
    return HttpResponse.json([
      {
        Id: 1,
        RHCooperativeNum: 12,
        HexColor: '#FF5733',
        Description: 'Red',
        IsActive: true,
      },
    ]);
  }),

  // Generic 404 fallback
  http.all('*', () => {
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }),
];
