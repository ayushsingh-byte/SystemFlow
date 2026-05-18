const aiService = require('../services/aiService');

async function chat(req, res) {
  const { question, context } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required' });
  }
  try {
    const reply = await aiService.chat(question, context || {});
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('[AI]', err.message);
    return res.status(500).json({ error: 'AI service error', detail: err.message });
  }
}

module.exports = { chat };
