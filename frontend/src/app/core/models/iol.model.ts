import { Currency } from './transaction.model';

// Nada de esto se persiste: viaja solo por request y por sessionStorage del navegador.
export interface IolLoginRequest {
  username: string;
  password: string;
}

export interface IolTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

// value/cost vienen calculados del backend (totales de IOL): qty * price no da value en bonos,
// que cotizan cada 100 nominales.
export interface IolHolding {
  ticker: string;
  name: string;
  qty: number;
  avgCost: number;
  price: number;
  currency: Currency;
  value: number;
  cost: number;
  result: number;
}

export interface IolPortfolioResponse {
  holdings: IolHolding[];
  cashArs: number;
  cashUsd: number;
}
