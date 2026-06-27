// Chat Session Manager for Zeus Novel Translator
// Purpose: Reuse chat sessions to avoid creating new ones for every request
// Rules:
// 1. One chat for all glossary/terminology extractions (shared across all chapters)
// 2. One chat per 100 chapters (e.g., chapters 1-100 in one chat, 101-200 in another)

const { v4: uuidv4 } = require('uuid');

// Store active chat sessions for ChatGPT Android
// These will store the conversation IDs and other session data
const activeSessions = new Map();

class ChatSessionManager {
    constructor() {
        // Session storage: key -> { conversationId, providerInfo, createdAt, lastUsed }
        this.sessions = new Map();
        
        // Track which provider/model each session uses
        this.sessionMetadata = new Map();
    }

    // Get the batch index for a chapter (0 for 1-100, 1 for 101-200, etc.)
    getBatchIndex(chapterNumber) {
        return Math.floor((chapterNumber - 1) / 100);
    }

    // Generate a session key for glossary
    getGlossarySessionKey(novelId) {
        return `glossary_${novelId}`;
    }

    // Generate a session key for chapters
    getChapterSessionKey(novelId, chapterNumber) {
        const batchIndex = this.getBatchIndex(chapterNumber);
        return `chapters_${novelId}_${batchIndex}`;
    }

    // Create a new session ID
    createSessionId() {
        return `zeus_${uuidv4()}`;
    }

    // Get or create a session for glossary extraction
    getGlossarySession(novelId, provider) {
        const sessionKey = this.getGlossarySessionKey(novelId);
        
        if (this.sessions.has(sessionKey)) {
            const session = this.sessions.get(sessionKey);
            // Verify the session is using the same provider
            const metadata = this.sessionMetadata.get(sessionKey);
            if (metadata && 
                metadata.providerId === (provider.providerId || provider.name)) {
                // Update last used time
                session.lastUsed = new Date();
                return session;
            }
        }

        // Create new session
        const newSession = {
            sessionId: this.createSessionId(),
            conversationId: null, // Will be set when first conversation is created
            providerId: provider.providerId || provider.name,
            createdAt: new Date(),
            lastUsed: new Date(),
            type: 'glossary'
        };

        this.sessions.set(sessionKey, newSession);
        this.sessionMetadata.set(sessionKey, {
            providerId: provider.providerId || provider.name,
            novelId: novelId
        });

        return newSession;
    }

    // Get or create a session for chapter translation
    getChapterSession(novelId, chapterNumber, provider) {
        const sessionKey = this.getChapterSessionKey(novelId, chapterNumber);
        
        if (this.sessions.has(sessionKey)) {
            const session = this.sessions.get(sessionKey);
            // Verify the session is using the same provider
            const metadata = this.sessionMetadata.get(sessionKey);
            if (metadata && 
                metadata.providerId === (provider.providerId || provider.name)) {
                // Update last used time
                session.lastUsed = new Date();
                return session;
            }
        }

        // Create new session
        const newSession = {
            sessionId: this.createSessionId(),
            conversationId: null, // Will be set when first conversation is created
            providerId: provider.providerId || provider.name,
            createdAt: new Date(),
            lastUsed: new Date(),
            type: 'chapters',
            batchIndex: this.getBatchIndex(chapterNumber),
            startChapter: this.getBatchIndex(chapterNumber) * 100 + 1,
            endChapter: (this.getBatchIndex(chapterNumber) + 1) * 100
        };

        this.sessions.set(sessionKey, newSession);
        this.sessionMetadata.set(sessionKey, {
            providerId: provider.providerId || provider.name,
            novelId: novelId
        });

        return newSession;
    }

    // Set the conversation ID for a session (called after first conversation is created)
    setConversationId(sessionKey, conversationId) {
        if (this.sessions.has(sessionKey)) {
            const session = this.sessions.get(sessionKey);
            session.conversationId = conversationId;
            this.sessions.set(sessionKey, session);
        }
    }

    // Get conversation ID for a session
    getConversationId(sessionKey) {
        if (this.sessions.has(sessionKey)) {
            return this.sessions.get(sessionKey).conversationId;
        }
        return null;
    }

    // Get session by key (for direct access)
    getSession(sessionKey) {
        return this.sessions.get(sessionKey);
    }

    // Clear a session (e.g., when switching providers)
    clearSession(sessionKey) {
        this.sessions.delete(sessionKey);
        this.sessionMetadata.delete(sessionKey);
    }

    // Clear all sessions for a novel
    clearNovelSessions(novelId) {
        const keysToDelete = [];
        for (const key of this.sessions.keys()) {
            if (key.startsWith(`glossary_${novelId}`) || key.startsWith(`chapters_${novelId}_`)) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            this.sessions.delete(key);
            this.sessionMetadata.delete(key);
        }
    }

    // Clear all sessions (use with caution)
    clearAllSessions() {
        this.sessions.clear();
        this.sessionMetadata.clear();
    }

    // Get session count for monitoring
    getSessionCount() {
        return this.sessions.size;
    }

    // List all active sessions (for debugging)
    listSessions() {
        return Array.from(this.sessions.entries()).map(([key, session]) => ({
            key,
            session,
            metadata: this.sessionMetadata.get(key)
        }));
    }
}

// Singleton instance
const chatSessionManager = new ChatSessionManager();

module.exports = chatSessionManager;
