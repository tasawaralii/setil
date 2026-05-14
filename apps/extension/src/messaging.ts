export type BlockPageMessage = {
  type: "BLOCK_PAGE";
  payload: {
    reason: string;
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
  };
};

export type ExtensionMessage =
  | BlockPageMessage
  | SaveCredentialsMessage
  | ScanningDownloadMessage
  | DownloadResultMessage
  | LogPermissionUseMessage
  | TrackingStrippedMessage;

export const isMessageType = <T extends ExtensionMessage["type"]>(
  message: unknown,
  type: T
): message is Extract<ExtensionMessage, { type: T }> => {
  return Boolean(
    message &&
      typeof message === "object" &&
      "type" in message &&
      (message as ExtensionMessage).type === type
  );
};