// Translation Service with Chat Session Management
// This service wraps the existing callTranslationProvider to reuse chat sessions

const chatSessionManager = require('./chatSessionManager');

// Store the original callTranslationProvider from translatorRoutes
let originalCallTranslationProvider = null;

// Function to set the original provider (will be called from translatorRoutes)
function setOriginalProvider(providerFunc) {
    originalCallTranslationProvider = providerFunc;
}

// Modified callTranslationProvider that supports chat sessions
async function callTranslationProviderWithSession(
    provider, 
    modelName, 
    apiKey, 
    prompt, 
    options = {}
) {
    // If no original provider is set, fall back to direct call
    if (!originalCallTranslationProvider) {
        throw new Error('Original callTranslationProvider not set. Call setOriginalProvider first.');
    }

    // Check if this is a ChatGPT Android provider (which supports sessions)
    const providerId = (provider.providerId || 'gemini').toLowerCase();
    const isChatGPT = providerId.includes('chatgpt') || 
                     providerId.includes('gpt') || 
                     (provider.selectedModel || '').toLowerCase() === 'auto' ||
                     (provider.models && provider.models.some(m => (m.modelId || '').toLowerCase() === 'auto'));

    // For non-ChatGPT providers, use the original function
    if (!isChatGPT) {
        return originalCallTranslationProvider(provider, modelName, apiKey, prompt, options);
    }

    // For ChatGPT Android, we need to handle sessions
    // Extract session info from options
    const sessionInfo = options.sessionInfo || {};
    const { novelId, chapterNumber, isGlossary } = sessionInfo;

    // Get or create a session
    let session;
    if (isGlossary && novelId) {
        session = chatSessionManager.getGlossarySession(novelId, provider, modelName);
    } else if (novelId && chapterNumber) {
        session = chatSessionManager.getChapterSession(novelId, chapterNumber, provider, modelName);
    }

    // If we have a session, we would use its sessionId for ChatGPT Android
    // However, the current ChatGPT Android implementation creates a new conversation each time
    // We need to modify the ChatGPT Android logic to support existing sessions
    
    // For now, we'll use the original function but track the session
    // In a full implementation, we would modify the ChatGPT Android API calls to use
    // the existing conversation ID instead of creating new ones
    
    // TODO: Implement actual session reuse for ChatGPT Android
    // This requires modifying the ChatGPT Android API calls to:
    // 1. Use an existing conversation ID if available
    // 2. Continue the conversation instead of starting a new one
    
    // For now, just use the original function
    return originalCallTranslationProvider(provider, modelName, apiKey, prompt, options);
}

// Helper function to get session info for a chapter
function getSessionInfoForChapter(novelId, chapterNumber) {
    return {
        novelId: novelId,
        chapterNumber: chapterNumber,
        isGlossary: false
    };
}

// Helper function to get session info for glossary
function getSessionInfoForGlossary(novelId) {
    return {
        novelId: novelId,
        isGlossary: true
    };
}

module.exports = {
    setOriginalProvider,
    callTranslationProviderWithSession,
    getSessionInfoForChapter,
    getSessionInfoForGlossary,
    chatSessionManager
};
