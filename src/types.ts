export interface Package {
  name: string;
  dataLimitMB: number;
  speedLimitMbps: number;
  durationHours: number;
  price: number;
}

export interface Session {
  code: string;
  secretKey: string;
  packageId: string;
  packageName: string;
  status: 'active' | 'expired';
  startTime: string;
  expiryTime: string;
  dataLimitMB: number;
  dataUsedMB: number;
  speedLimitMbps: number;
  userId?: string;
  lastAlertData?: boolean;
  lastAlertTime?: boolean;
}

export interface AppControl {
  allowedApps: string[];
  broadcastMessage: string;
  popupSSID?: string;
  popupGatewayIP?: string;
  updatedAt: string;
}

export interface UsageLog {
  sessionId: string;
  timestamp: string;
  dataTransferredMB: number;
}

export interface HotspotSession extends Session {
  id: string;
}

export interface HotspotPackage extends Package {
  id: string;
}
