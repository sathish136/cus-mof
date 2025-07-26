interface ActiveSession {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  macAddress?: string;
  loginTime: Date;
  lastActivity: Date;
  licenseKey: string;
}

class SessionManager {
  private activeSessions: Map<string, ActiveSession> = new Map();

  addSession(sessionId: string, ipAddress: string, userAgent: string, licenseKey: string): void {
    const session: ActiveSession = {
      sessionId,
      ipAddress,
      userAgent,
      loginTime: new Date(),
      lastActivity: new Date(),
      licenseKey
    };
    
    this.activeSessions.set(sessionId, session);
    console.log(`New session added: ${sessionId} from ${ipAddress}`);
  }

  updateActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  removeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    console.log(`Session removed: ${sessionId}`);
  }

  getActiveSessionsForLicense(licenseKey: string): ActiveSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.licenseKey === licenseKey);
  }

  getAllActiveSessions(): ActiveSession[] {
    return Array.from(this.activeSessions.values());
  }

  getSessionCount(licenseKey?: string): number {
    if (licenseKey) {
      return this.getActiveSessionsForLicense(licenseKey).length;
    }
    return this.activeSessions.size;
  }

  // Clean up sessions older than 30 minutes of inactivity
  cleanupInactiveSessions(): void {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.lastActivity < thirtyMinutesAgo) {
        this.removeSession(sessionId);
      }
    }
  }
}

export const sessionManager = new SessionManager();

// Clean up inactive sessions every 5 minutes
setInterval(() => {
  sessionManager.cleanupInactiveSessions();
}, 5 * 60 * 1000);