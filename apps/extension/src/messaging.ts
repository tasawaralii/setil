export type BlockPageMessage = {
  type: "BLOCK_PAGE";
  payload: {
    reason: string;
    domain: string;
  };
};

export type SaveCredentialsMessage = {
  type: "SAVE_CREDS";
  payload: {
    username: string | null;
    password: string;
    origin: string;
  };
};

export type ScanningDownloadMessage = {
  type: "SCANNING_DOWNLOAD";
  payload: {
    filename?: string;
  };
};

export type DownloadResultMessage = {
  type: "DOWNLOAD_RESULT";
  payload: {
    status: "scanning" | "safe" | "malicious" | "error";
    filename?: string;
    reason?: string;
    downloadId?: number;
  };
};

export type OverrideDownloadMessage = {
  type: "OVERRIDE_DOWNLOAD";
  payload: {
    downloadId: number;
  };
};

export type CancelDownloadMessage = {
  type: "CANCEL_DOWNLOAD";
  payload: {
    downloadId: number;
  };
};

export type LogPermissionUseMessage = {
  type: "LOG_PERMISSION_USE";
  payload: {
    permission: string;
    origin: string;
  };
};

export type TrackingStrippedMessage = {
  type: "TRACKING_STRIPPED";
  payload: {
    url: string;
    removedParams: string[];
    originalUrl: string;
  };
};

export type TrackingScriptsDetectedMessage = {
  type: "TRACKING_SCRIPTS_DETECTED";
  payload: {
    scripts: string[];
    pageUrl: string;
    timestamp: string;
  };
};

export type GetCredentialsMessage = {
  type: "GET_CREDS";
  payload: {
    origin: string;
  };
};

export type GeneratePasswordMessage = {
  type: "GENERATE_PASSWORD";
  payload?: Record<string, never>;
};

export type AllowSessionPhishingMessage = {
  type: "ALLOW_SESSION_PHISHING";
  payload: {
    domain: string;
  };
};

export type TrustDomainPhishingMessage = {
  type: "TRUST_DOMAIN_PHISHING";
  payload: {
    domain: string;
  };
};

export type ExtensionMessage =
  | BlockPageMessage
  | SaveCredentialsMessage
  | ScanningDownloadMessage
  | DownloadResultMessage
  | OverrideDownloadMessage
  | CancelDownloadMessage
  | LogPermissionUseMessage
  | TrackingStrippedMessage
  | TrackingScriptsDetectedMessage
  | GetCredentialsMessage
  | GeneratePasswordMessage
  | AllowSessionPhishingMessage
  | TrustDomainPhishingMessage

export const isMessageType = <T extends ExtensionMessage["type"]>(
  message: unknown,
  type: T,
): message is Extract<ExtensionMessage, { type: T }> => {
  return Boolean(
    message &&
    typeof message === "object" &&
    "type" in message &&
    (message as ExtensionMessage).type === type,
  );
};
