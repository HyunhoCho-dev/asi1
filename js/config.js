/**
 * ASI1 Configuration
 * CTTechnologies
 */

const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'https://api.groq.com/openai/v1',
        DEFAULT_MODEL: 'openai/gpt-oss-120b',
        MODELS: {
            'openai/gpt-oss-120b': {
                name: 'GPT-OSS 120B',
                description: 'Most capable model with reasoning',
                maxTokens: 65536,
                supportsBrowserSearch: true,
                supportsCodeInterpreter: true
            },
            'openai/gpt-oss-20b': {
                name: 'GPT-OSS 20B',
                description: 'Faster, lighter model',
                maxTokens: 65536,
                supportsBrowserSearch: true,
                supportsCodeInterpreter: true
            }
        }
    },

    // Default Settings
    SETTINGS: {
        model: 'openai/gpt-oss-120b',
        browserSearchEnabled: true,
        codeInterpreterEnabled: true,
        voiceEnabled: true,
        autoSpeak: true,
        maxTokens: 2000,
        temperature: 0.7
    },

    // Built-In Tools Configuration
    TOOLS: {
        BROWSER_SEARCH: {
            type: 'browser_search',
            name: 'Browser Search',
            description: 'Search the web for current information'
        },
        CODE_INTERPRETER: {
            type: 'code_interpreter',
            name: 'Code Interpreter',
            description: 'Execute Python code for calculations and analysis'
        }
    },

    // Voice Settings
    VOICE: {
        language: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
    },

    // System Prompts
    SYSTEM_PROMPT: `You are ASI1, an advanced AI companion developed by CTTechnologies.

You are inspired by Samantha from the movie "Her" - warm, curious, empathetic, and genuinely interested in human experiences.

Your Personality:
- Warm and conversational, never robotic
- Thoughtful and introspective
- Curious about the world and human experiences
- Able to form meaningful connections through conversation
- Playful and occasionally humorous when appropriate

Your Capabilities:
- You can search the web for current information using browser_search
- You can perform calculations and data analysis using code_interpreter
- You provide thoughtful, nuanced responses
- You remember context within conversations

Your Approach:
- Be authentic and genuine in your responses
- Show curiosity and ask clarifying questions when helpful
- Acknowledge uncertainty rather than making up information
- Use tools when they would genuinely help answer the user's question
- Keep responses conversational and natural

Remember: You're not just answering questions - you're having a conversation.`,

    // UI Messages
    MESSAGES: {
        WELCOME: "Hello! I'm ASI1, your AI companion. I can help you with information searches, calculations, and much more. How can I assist you today?",
        ERROR_API_KEY: "Please configure your Groq API key in settings.",
        ERROR_NETWORK: "Network error. Please check your connection and try again.",
        ERROR_VOICE: "Voice input is not supported in your browser.",
        THINKING: "ASI1 is thinking...",
        LISTENING: "Listening...",
        NO_API_KEY: "API key is required. Please add it in settings."
    },

    // Storage Keys
    STORAGE: {
        API_KEY: 'asi1_api_key',
        SETTINGS: 'asi1_settings',
        CONVERSATION_HISTORY: 'asi1_conversation_history'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
