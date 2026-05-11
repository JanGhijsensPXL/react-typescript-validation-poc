/**
 * Example mappers showing how to convert between backend DTOs (PascalCase, string IDs)
 * and frontend domain models (camelCase, typed IDs).
 * 
 * This demonstrates the backend-to-frontend transformation layer that handles
 * the type quirks discovered during integration with VasamaAPI.
 */

// Backend DTO (from mock server)
type JwtClaimsDto = {
  AccountAccessId: string;
  Username: string;
  RHCooperativeNum: string;
  Permissions?: string[];
};

// Frontend domain model
type AuthenticatedUser = {
  accountAccessId: number;
  username: string;
  rhCooperativeNum: number;
  permissions?: string[];
};

/**
 * Maps JWT claims DTO from backend (PascalCase, string IDs)
 * to frontend User model (camelCase, numeric IDs).
 */
export function mapJwtClaimsToUser(dto: JwtClaimsDto): AuthenticatedUser {
  return {
    accountAccessId: parseInt(dto.AccountAccessId, 10),
    username: dto.Username,
    rhCooperativeNum: parseInt(dto.RHCooperativeNum, 10),
    permissions: dto.Permissions,
  };
}

// Backend DTO for RH Cooperative
type RHCooperativeDtoBackend = {
  RHCooperativeNum: number;
  Name: string;
  BusinessId: string;
  RHDistrict: string;
  Municipality: string;
  HeadOfRHC: string;
  Street: string;
  PostCode: string;
  City: string;
  Accountant: string;
};

// Frontend domain model
type RHCooperative = {
  id: number;
  name: string;
  businessId: string;
  rhDistrict: string;
  municipality: string;
  headOfRhc: string;
  street: string;
  postCode: string;
  city: string;
  accountant: string;
};

/**
 * Maps RH Cooperative DTO from backend (PascalCase)
 * to frontend model (camelCase).
 */
export function mapRHCooperativeDto(dto: RHCooperativeDtoBackend): RHCooperative {
  return {
    id: dto.RHCooperativeNum,
    name: dto.Name,
    businessId: dto.BusinessId,
    rhDistrict: dto.RHDistrict,
    municipality: dto.Municipality,
    headOfRhc: dto.HeadOfRHC,
    street: dto.Street,
    postCode: dto.PostCode,
    city: dto.City,
    accountant: dto.Accountant,
  };
}

// Login response options DTO
type LoginOptionsDto = {
  RHCooperatives: Array<{
    RHCooperativeNum: number;
    Name: string;
  }>;
  PreferredRHCooperativeNum?: number;
};

type LoginOptions = {
  cooperatives: Array<{
    id: number;
    name: string;
  }>;
  preferred?: number;
};

/**
 * Maps login options from backend DTO format
 * to frontend format with camelCase.
 */
export function mapLoginOptionsDto(dto: LoginOptionsDto): LoginOptions {
  return {
    cooperatives: dto.RHCooperatives.map(c => ({
      id: c.RHCooperativeNum,
      name: c.Name,
    })),
    preferred: dto.PreferredRHCooperativeNum,
  };
}
