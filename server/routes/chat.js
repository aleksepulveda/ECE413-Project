// server/routes/chat.js
// -------------------------------------------------------------
// AI Chat Route (RAG Implementation)
// -------------------------------------------------------------
// 1. Receives user question.
// 2. Retrieves User profile and Devices.
// 3. Retrieves last 20 health measurements from MongoDB.
// 4. Augments the prompt with this real data.
// 5. Sends prompt to Local LLM (via Tailscale tunnel).
// -------------------------------------------------------------

const express = require('express');
const axios = require('axios');
const router = express.Router();
const User = require('../models/User');
const Device = require('../models/Device');
const Measurement = require('../models/Measurement');

// POST /api/chat
// Body: { question: "What was my heart rate last night?" }
router.post('/', async (req, res, next) => {
  try {
    const { question } = req.body;
    const userId = req.user.id; // From authMiddleware

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // --- STEP 1: RETRIEVAL (Gathering Context) ---

    // A. Fetch User details (for personalized greeting)
    const currentUser = await User.findById(userId);
    const userName = currentUser ? currentUser.name : "User";

    // B. Fetch User's Devices (to map IDs to names like "Bedroom Sensor")
    const userDevices = await Device.find({ userId });
    
    // Create a map for quick lookup: { "PHOTON_123": "Bedroom Sensor" }
    const deviceMap = {};
    const deviceIds = [];
    
    userDevices.forEach(d => {
      deviceMap[d.deviceId] = d.name;
      deviceIds.push(d.deviceId);
    });

    // C. Fetch recent measurements (The "Knowledge Base")
    // We limit to 20 to keep the prompt size small for the local LLM
    const recentData = await Measurement.find({ deviceId: { $in: deviceIds } })
      .sort({ takenAt: -1 })
      .limit(20);

    // --- STEP 2: AUGMENTATION (Building the Prompt) ---

    // Format the database data into a human-readable string
    const dataContext = recentData.map(m => {
      const deviceName = deviceMap[m.deviceId] || 'Unknown Device';
      // Use 'en-US' locale for consistent date formatting
      const dateStr = new Date(m.takenAt).toLocaleString('en-US', { timeZone: 'America/Phoenix' });
      return `- [${dateStr}] Device: "${deviceName}" | Heart Rate: ${m.heartRate} bpm | SpO2: ${m.spo2}%`;
    }).join('\n');

    // Construct the System Prompt
    const systemPrompt = `
      You are a helpful Health AI Assistant for ${userName}.
      
      INSTRUCTIONS:
      1. Answer the user's question based ONLY on the "Recent Health Records" provided below.
      2. If the answer is not in the data, explicitly state "I don't have that information in your recent records."
      3. Be concise, friendly, and encouraging.
      4. Do not provide medical diagnoses.
      
      RECENT HEALTH RECORDS:
      ${dataContext || "No recent records found."}
    `;

    // --- STEP 3: GENERATION (Sending to Local LLM) ---
    
    const llmUrl = process.env.LLM_TUNNEL_URL; 
    
    if (!llmUrl) {
      console.error("LLM_TUNNEL_URL is missing in .env");
      return res.status(503).json({ error: 'AI Service configuration error.' });
    }

    // Call Ollama API via Tailscale
    // We use "phi3:mini" (or "gemma:2b" if you chose that one)
    const response = await axios.post(`${llmUrl}/api/generate`, {
      model: "phi3:mini", 
      prompt: `${systemPrompt}\n\nUser Question: ${question}`,
      stream: false
    });

    // --- STEP 4: RESPONSE ---
    return res.json({ 
      answer: response.data.response 
    });

  } catch (err) {
    console.error('AI Chat Error:', err.message);
    // If Axios fails (tunnel down, laptop off, etc.)
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
       return res.status(503).json({ error: 'AI Brain is currently offline. Please try again later.' });
    }
    next(err);
  }
});

module.exports = router;