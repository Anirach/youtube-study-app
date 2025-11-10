const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class LLMService {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'openai';
    this.initializeProviders();
  }

  initializeProviders() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }

    // Initialize Gemini
    if (process.env.GEMINI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    // Local LLM configuration
    this.localLLMUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434';
    this.localLLMModel = process.env.LOCAL_LLM_MODEL || 'llama2';
  }

  /**
   * Generate summary from transcript
   */
  async generateSummary(transcriptText, videoTitle) {
    const summaries = await Promise.all([
      this.generateQuickSummary(transcriptText, videoTitle),
      this.generateDetailedSummary(transcriptText, videoTitle),
      this.extractKeyPoints(transcriptText, videoTitle)
    ]);

    return {
      quick: summaries[0],
      detailed: summaries[1],
      keyPoints: summaries[2]
    };
  }

  /**
   * Generate quick summary (50 words)
   */
  async generateQuickSummary(transcriptText, videoTitle) {
    const prompt = `Summarize the following video transcript in exactly 50 words or less. Focus on the main topic and key takeaway.

Video Title: ${videoTitle}

Transcript:
${transcriptText.substring(0, 4000)}

Summary (50 words max):`;

    return await this.complete(prompt, 100);
  }

  /**
   * Generate detailed summary (500 words)
   */
  async generateDetailedSummary(transcriptText, videoTitle) {
    const prompt = `Provide a comprehensive summary of the following video transcript in approximately 500 words. Include:
- Main topics covered
- Key arguments or explanations
- Important examples or demonstrations
- Conclusions or takeaways

Video Title: ${videoTitle}

Transcript:
${transcriptText.substring(0, 8000)}

Detailed Summary:`;

    return await this.complete(prompt, 800);
  }

  /**
   * Extract key points
   */
  async extractKeyPoints(transcriptText, videoTitle) {
    const prompt = `Extract 5-7 key points from the following video transcript. Format as a bullet list.

Video Title: ${videoTitle}

Transcript:
${transcriptText.substring(0, 6000)}

Key Points:`;

    const response = await this.complete(prompt, 400);
    
    // Parse bullet points
    const points = response
      .split('\n')
      .filter(line => line.trim().match(/^[-•*\d.]/))
      .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(point => point.length > 0);

    return points;
  }

  /**
   * Chat completion
   */
  async chat(messages, context = null) {
    if (this.provider === 'openai' && this.openai) {
      return await this.chatOpenAI(messages, context);
    } else if (this.provider === 'gemini' && this.gemini) {
      return await this.chatGemini(messages, context);
    } else if (this.provider === 'local') {
      return await this.chatLocal(messages, context);
    } else {
      throw new Error('No LLM provider configured');
    }
  }

  /**
   * Complete text using configured provider
   */
  async complete(prompt, maxTokens = 500) {
    if (this.provider === 'openai' && this.openai) {
      return await this.completeOpenAI(prompt, maxTokens);
    } else if (this.provider === 'gemini' && this.gemini) {
      return await this.completeGemini(prompt, maxTokens);
    } else if (this.provider === 'local') {
      return await this.completeLocal(prompt, maxTokens);
    } else {
      throw new Error('No LLM provider configured');
    }
  }

  /**
   * OpenAI completion
   */
  async completeOpenAI(prompt, maxTokens) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw new Error(`OpenAI completion failed: ${error.message}`);
    }
  }

  /**
   * Gemini completion
   */
  async completeGemini(prompt, maxTokens) {
    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Gemini completion error:', error);
      throw new Error(`Gemini completion failed: ${error.message}`);
    }
  }

  /**
   * Local LLM completion (Ollama)
   */
  async completeLocal(prompt, maxTokens) {
    try {
      const axios = require('axios');
      const response = await axios.post(`${this.localLLMUrl}/api/generate`, {
        model: this.localLLMModel,
        prompt: prompt,
        stream: false
      });

      return response.data.response.trim();
    } catch (error) {
      console.error('Local LLM completion error:', error);
      throw new Error(`Local LLM completion failed: ${error.message}`);
    }
  }

  /**
   * OpenAI chat
   */
  async chatOpenAI(messages, context) {
    try {
      const systemMessage = context 
        ? { role: 'system', content: `Context from videos:\n${context}` }
        : { role: 'system', content: 'You are a helpful assistant for analyzing YouTube video content.' };

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [systemMessage, ...messages],
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error(`OpenAI chat failed: ${error.message}`);
    }
  }

  /**
   * Gemini chat
   */
  async chatGemini(messages, context) {
    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      
      // Format messages for Gemini
      const prompt = context 
        ? `Context from videos:\n${context}\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
        : messages.map(m => `${m.role}: ${m.content}`).join('\n');

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini chat error:', error);
      throw new Error(`Gemini chat failed: ${error.message}`);
    }
  }

  /**
   * Local LLM chat
   */
  async chatLocal(messages, context) {
    try {
      const axios = require('axios');
      const prompt = context 
        ? `Context from videos:\n${context}\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`
        : messages.map(m => `${m.role}: ${m.content}`).join('\n');

      const response = await axios.post(`${this.localLLMUrl}/api/generate`, {
        model: this.localLLMModel,
        prompt: prompt,
        stream: false
      });

      return response.data.response;
    } catch (error) {
      console.error('Local LLM chat error:', error);
      throw new Error(`Local LLM chat failed: ${error.message}`);
    }
  }
}

module.exports = new LLMService();

