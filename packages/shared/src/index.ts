export type ApiStatus = {
  status: "ok" | "error";
  message: string;
};

export type SecurityEvent = {
  id: string;
  type: "url" | "password" | "auth";
  source: string;
  createdAt: string;
};