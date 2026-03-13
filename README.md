# OptiExtract 🚀

**OptiExtract** is an AI-powered web utility designed to automate image performance audits and accessibility checks. By analyzing your HTML or live URLs, it provides a comprehensive optimization blueprint using Google Gemini AI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google)

## ✨ Features

- **Automated Extraction:** Scrape image data from raw HTML or live URLs.
- **AI-Powered Insights:** Uses Gemini 2.5 Flash to categorize images (Hero, Icon, etc.) and suggest optimizations.
- **Performance Blueprint:** Get recommended `srcset` widths, modern formats (WebP/AVIF), and `sizes` attributes.
- **Accessibility Audit:** Context-aware `alt` text suggestions to improve screen reader support.
- **Secure Backend:** API keys are protected server-side with built-in rate limiting (2 requests/24h).

## 🛠️ Tech Stack

- **Frontend:** React 19, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js, Express.js.
- **AI Integration:** Google Generative AI SDK (Gemini).
- **Rate Limiting:** `express-rate-limit`.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- A Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/optiextract.git
   cd optiextract
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the application:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

## 🛡️ Security

- **API Key Protection:** The Gemini API key is stored in environment variables and used only on the server side. It is never exposed to the client.
- **Rate Limiting:** To prevent abuse, the `/api/analyze` endpoint is limited to 2 requests per 24 hours per IP address.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙌 Acknowledgments

- Built with [Google AI Studio](https://ai.studio).
- Icons by [Lucide](https://lucide.dev).
