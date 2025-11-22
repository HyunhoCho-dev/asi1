# ASI1 - Advanced AI Companion

<div align="center">

![ASI1 Logo](https://img.shields.io/badge/ASI1-AI%20Companion-D4845C?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Developed by CTTechnologies**

*An intelligent AI companion inspired by Samantha from the movie "Her"*

[Live Demo](#) | [Documentation](#features) | [Get Started](#getting-started)

</div>

---

## 🌟 Overview

ASI1 is a sophisticated AI companion web application that leverages Groq's GPT-OSS models and Built-In Tools to provide intelligent, conversational interactions. Inspired by Samantha from the movie "Her", ASI1 offers warm, empathetic, and genuinely helpful assistance.

### ✨ Key Features

- 🤖 **Powered by GPT-OSS Models** - Utilizing Groq's fastest inference models
- 🔍 **Real-time Web Search** - Access current information instantly
- 💻 **Code Execution** - Perform calculations and data analysis
- 🎤 **Voice Input** - Natural voice conversations using Web Speech API
- 🔊 **Voice Output** - Text-to-speech for response playback
- 🎨 **Elegant UI** - Warm, sophisticated design with smooth animations
- ⚡ **Lightning Fast** - Powered by Groq's LPU infrastructure
- 🛠️ **Built-In Tools** - Automatic tool selection and execution

## 🚀 Technologies

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **AI Model**: Groq GPT-OSS 120B / 20B
- **Tools**: Browser Search, Code Interpreter
- **Voice**: Web Speech API (Recognition & Synthesis)
- **Styling**: Custom CSS with CSS Variables
- **Fonts**: Playfair Display (headings), Inter (body)

## 📋 Prerequisites

Before you begin, ensure you have:

1. A modern web browser (Chrome, Firefox, Safari, or Edge)
2. A Groq API key (get one at [console.groq.com](https://console.groq.com))
3. Internet connection

## 🎯 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/HyunhoCho-dev/asi1.git
cd asi1
```

### 2. Open in Browser

Simply open `index.html` in your web browser:

```bash
# Using Python's built-in server
python -m http.server 8000

# Or using Node.js http-server
npx http-server
```

Then navigate to `http://localhost:8000`

### 3. Configure API Key

1. Click the settings icon (⚙️) in the top right
2. Enter your Groq API key
3. Select your preferred model (GPT-OSS 120B recommended)
4. Enable desired tools (Browser Search, Code Interpreter)
5. Click "Save Settings"

### 4. Start Chatting!

Click "Start Conversation" and begin interacting with ASI1.

## 🎨 Features in Detail

### 🤖 AI Capabilities

- **Natural Conversations**: Warm, empathetic responses inspired by Samantha
- **Contextual Understanding**: Maintains conversation history
- **Tool Selection**: Automatically chooses appropriate tools
- **Multi-turn Dialogues**: Remembers context throughout the conversation

### 🔧 Built-In Tools

#### Browser Search
- Real-time web search capabilities
- Fetches current information from the internet
- Automatically used when current data is needed

#### Code Interpreter
- Execute Python code safely
- Perform complex calculations
- Data analysis and visualization
- Mathematical computations

### 🎤 Voice Features

#### Voice Input
- Click the microphone button to start recording
- Natural speech recognition
- Automatic transcription to text

#### Voice Output
- Text-to-speech for AI responses
- Adjustable speech rate and pitch
- Can be enabled/disabled in settings

### ⚙️ Customization

#### Available Models
- **GPT-OSS 120B**: Most capable model with reasoning
- **GPT-OSS 20B**: Faster, lighter alternative

#### Settings
- Enable/disable Built-In Tools
- Voice input on/off
- Auto-speak responses
- Model selection

## 📁 Project Structure

```
asi1/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # Complete styling
├── js/
│   ├── config.js          # Configuration constants
│   └── app.js             # Main application logic
├── assets/                # (Future: images, fonts)
└── README.md              # This file
```

## 🎨 Design Philosophy

ASI1's design follows these principles:

- **Warm & Welcoming**: Soft color palette with warm tones
- **Sophisticated**: Premium typography and elegant spacing
- **Clean**: Minimal, distraction-free interface
- **Responsive**: Smooth animations and transitions
- **Accessible**: High contrast and readable fonts

### Color Palette

```css
Primary: #D4845C (Warm coral)
Background: #FAF8F5 (Soft cream)
Text: #2C2416 (Rich brown)
Accents: #E9A17C (Light coral)
```

### Typography

- **Headings**: Playfair Display (elegant serif)
- **Body**: Inter (clean sans-serif)

## 🔐 Privacy & Security

- API keys are stored locally in browser's localStorage
- No data is sent to external servers except Groq API
- Conversation history is stored locally
- No tracking or analytics

## 🛠️ Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/HyunhoCho-dev/asi1.git
cd asi1

# Open in your favorite code editor
code .

# Start local server
python -m http.server 8000
```

### Code Structure

#### config.js
Contains all configuration constants:
- API endpoints
- Model settings
- System prompts
- UI messages

#### app.js
Main application class with methods:
- `init()`: Initialize the application
- `sendMessage()`: Handle user messages
- `callGroqAPI()`: Make API requests
- `speak()`: Text-to-speech
- Voice recognition handling

## 📊 API Usage

### Groq API Integration

```javascript
// Example API call structure
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [...],
        tools: [
            { type: 'browser_search' },
            { type: 'code_interpreter' }
        ]
    })
});
```

### Built-In Tools

Tools are automatically executed server-side:

```javascript
// Enable tools in your request
tools: [
    { type: 'browser_search' },      // Web search
    { type: 'code_interpreter' }     // Code execution
]
```

## 🎯 Use Cases

- **Research Assistant**: Search for current information
- **Math Helper**: Perform complex calculations
- **Coding Support**: Execute code snippets
- **General Conversation**: Warm, empathetic AI companion
- **Learning**: Explain complex topics
- **Brainstorming**: Creative idea generation

## 🚧 Roadmap

- [ ] Conversation history export
- [ ] Multiple conversation threads
- [ ] Custom voice selection
- [ ] Theme customization
- [ ] Mobile app version
- [ ] Advanced code execution features
- [ ] Image understanding capabilities
- [ ] Multi-language support

## 🐛 Known Issues

- Voice recognition requires HTTPS in production
- Speech synthesis varies by browser
- Safari may have limited voice options

## 💡 Tips

1. **Best Results**: Use GPT-OSS 120B for complex tasks
2. **Voice Input**: Speak clearly and pause before clicking send
3. **Tools**: Let ASI1 automatically decide which tools to use
4. **Context**: Reference previous messages for better understanding

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by the movie "Her" and Samantha AI
- Powered by [Groq](https://groq.com) infrastructure
- Built with love by CTTechnologies

## 📧 Contact

For questions or support:
- GitHub: [Issues](https://github.com/HyunhoCho-dev/asi1/issues)

---

<div align="center">

**Made with ❤️ by CTTechnologies**

[⬆ Back to Top](#asi1---advanced-ai-companion)

</div>