export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  messages: string[];
}
