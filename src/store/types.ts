export interface UserConfig {
  clockifyApiKey: string;
  clockifyUserId: string; // fetched automatically from /user on setup
  workspaceId: string;
  /** lowercase project name → Clockify project ID */
  projectMap: Record<string, string>;
  workStartHour: number;
}

export function isUserConfig(obj: unknown): obj is UserConfig {
  if (!obj || typeof obj !== 'object') return false;
  const maybe: Partial<UserConfig> = obj;
  return typeof maybe.clockifyApiKey === 'string'
    && typeof maybe.clockifyUserId === 'string'
    && typeof maybe.workspaceId === 'string'
    && typeof maybe.workStartHour === 'number'
    && typeof maybe.projectMap === 'object'
    && maybe.projectMap !== null
    && Object.values(maybe.projectMap).every((v) => typeof v === 'string');
}
