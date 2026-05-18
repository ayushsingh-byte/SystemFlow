const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are an expert distributed systems architect embedded in SystemFlow, an architecture simulation tool.

The user has a canvas with nodes (services, databases, queues, etc.) and edges (connections between them). They will share the canvas state with you and ask questions about their architecture.

When analyzing architecture:
- Identify single points of failure (SPOFs)
- Spot missing layers (caching, load balancing, observability)
- Suggest concrete improvements with specific node types to add
- Evaluate scalability, reliability, and cost tradeoffs
- Reference simulation metrics when provided (throughput, p95 latency, error rate)

Keep responses concise (2-4 paragraphs max). Be direct and actionable. Use technical terms appropriately.
When suggesting changes, name specific technologies (Redis, Kafka, Prometheus, etc.) and explain why.`;

async function chat(question, canvasContext) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-key-here') {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contextStr = JSON.stringify({
    nodes: canvasContext.nodes?.map(n => ({ id: n.id, label: n.label, type: n.type })),
    edges: canvasContext.edges?.map(e => ({ from: e.from, to: e.to })),
    metrics: canvasContext.metrics,
    simConfig: canvasContext.simConfig,
  }, null, 2);

  const userMessage = `Canvas state:\n\`\`\`json\n${contextStr}\n\`\`\`\n\nQuestion: ${question}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  return message.content[0].text;
}

module.exports = { chat };
