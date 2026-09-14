// src/services/appVersionService.ts
import * as Application from "expo-application";
import { API_BASE_URL } from "../config";

interface AppVersionInfo {
  latestVersion: string;
  minimumVersion: string;
  playStoreUrl: string;
}

export const getCurrentAppVersion = (): string => {
  return Application.nativeApplicationVersion ?? "0.0.0";
};

export const fetchAppVersionInfo = async (): Promise<AppVersionInfo> => {
  const response = await fetch(`${API_BASE_URL}/api/app/version`);
  if (!response.ok) {
    throw new Error(`Failed to fetch app version: ${response.status}`);
  }

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("latestVersion" in data) ||
    typeof data.latestVersion !== "string" ||
    !("minimumVersion" in data) ||
    typeof data.minimumVersion !== "string" ||
    !("playStoreUrl" in data) ||
    typeof data.playStoreUrl !== "string" ||
    data.playStoreUrl.trim().length === 0
  ) {
    throw new Error("Invalid app version response");
  }

  return data as AppVersionInfo;
};

export const compareVersions = (versionA: string, versionB: string): number => {
  const a = versionA.split(".").map(Number);
  const b = versionB.split(".").map(Number);
  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i++) {
    const numberA = a[i] ?? 0;
    const numberB = b[i] ?? 0;
    if (numberA > numberB) return 1;
    if (numberA < numberB) return -1;
  }
  return 0;
};

export type UpdateStatus = "UP_TO_DATE" | "OPTIONAL_UPDATE" | "REQUIRED_UPDATE";

export const checkForUpdate = async (): Promise<{
  status: UpdateStatus;
  playStoreUrl?: string;
}> => {
  const currentVersion = getCurrentAppVersion();
  const versionInfo = await fetchAppVersionInfo();

  if (compareVersions(currentVersion, versionInfo.minimumVersion) < 0) {
    return {
      status: "REQUIRED_UPDATE",
      playStoreUrl: versionInfo.playStoreUrl,
    };
  }

  if (compareVersions(currentVersion, versionInfo.latestVersion) < 0) {
    return {
      status: "OPTIONAL_UPDATE",
      playStoreUrl: versionInfo.playStoreUrl,
    };
  }

  return {
    status: "UP_TO_DATE",
  };
};
