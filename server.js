const express = require('express');
const path = require('path');
const OpenAI = require('openai');

const { buildExercisePrompt } = require('./lib/exercise-prompt');
const { validateBatch } = require('./lib/exercise-validation');
const { resolveTopic } = require('./lib/grammar-rules');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const aitunnelClient = process.env.AITUNNEL_API_KEY
  ? new OpenAI({
      apiKey: process.env.AITUNNEL_API_KEY,
      baseURL: 'https://api.aitunnel.ru/v1',
    })
  : null;

const AITUNNEL_MODELS = (process.env.AITUNNEL_MODELS || 'gpt-5.4,gpt-5.2,gpt-5,gpt-5-mini,gpt-4o,gpt-4o-mini')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

// Überzählige Aufgaben eines Durchgangs für den nächsten Abruf.
const questionPool = {};

/** Das JSON-Array aus der Modellantwort schneiden und parsen. */
function parseQuestionArray(text) {
  const match = String(text || '').match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(match ? match[0] : text);
  return Array.isArray(parsed) ? parsed : [];
}

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/generate-questions', async (req, res) => {
  const { level, lexicalTopic, grammarTopic, isWortstellung, count, exclude } = req.body || {};

  if (!level || !grammarTopic) {
    return res.status(400).json({ error: 'level and grammarTopic are required' });
  }

  if (!aitunnelClient) {
    return res.status(503).json({ error: 'AITUNNEL_API_KEY is not configured' });
  }

  const questionsCount = Math.max(1, Math.min(20, Number(count) || 10));
  const cacheKey = `${level}:${grammarTopic}:${lexicalTopic || ''}:${isWortstellung ? 'w' : 'g'}`;

  if (questionPool[cacheKey] && questionPool[cacheKey].length >= questionsCount) {
    return res.json({ questions: questionPool[cacheKey].splice(0, questionsCount) });
  }

  // Etwas mehr anfordern, als gebraucht wird: Die Substanz- und Dublettenprüfung
  // sortiert regelmäßig einzelne Aufgaben aus.
  const requestCount = Math.min(20, questionsCount + 4);

  const prompt = buildExercisePrompt({
    level,
    lexicalTopic,
    grammarTopic,
    isWortstellung: Boolean(isWortstellung),
    count: requestCount,
    exclude: Array.isArray(exclude) ? exclude : [],
    output: 'json',
  });

  const errors = [];
  let text = null;

  for (const model of AITUNNEL_MODELS) {
    try {
      const completion = await aitunnelClient.chat.completions.create({
        model,
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      });
      const content = completion.choices?.[0]?.message?.content;
      if (content && content.trim()) {
        text = content.trim();
        break;
      }
      errors.push(`${model}: empty response`);
    } catch (err) {
      const detail = err?.message || String(err);
      errors.push(`${model}: ${detail}`);
      console.error(`AI Tunnel error on model ${model}:`, detail);
    }
  }

  if (!text) {
    return res.status(502).json({ error: 'AI Tunnel: all models failed', detail: errors.join(' | ') });
  }

  let parsed;
  try {
    parsed = parseQuestionArray(text);
  } catch (err) {
    console.error('JSON parse error:', err.message, 'Raw text:', text.slice(0, 500));
    return res.status(502).json({ error: 'Failed to parse LLM response', detail: err.message });
  }

  const { questions, rejected, formatCounts } = validateBatch(parsed, {
    grammarTopic,
    isWortstellung: Boolean(isWortstellung),
    count: questionsCount,
    exclude: Array.isArray(exclude) ? exclude : [],
  });

  // Die Ablehnungsgründe zeigen, woran das Modell gerade scheitert — ohne sie
  // sieht man nur, dass zu wenige Aufgaben ankommen.
  if (rejected.length) {
    console.warn(
      `[${resolveTopic(grammarTopic) || grammarTopic} ${level}] ${questions.length}/${parsed.length} Aufgaben übernommen;` +
      ` aussortiert: ${rejected.join('; ')}`
    );
  }
  if (questions.length) {
    console.log(`[${resolveTopic(grammarTopic) || grammarTopic} ${level}] Formate:`, formatCounts);
  }

  if (!questions.length) {
    return res.status(502).json({
      error: 'No valid questions in LLM response',
      detail: rejected.slice(0, 5).join('; '),
    });
  }

  if (questions.length > questionsCount) {
    if (!questionPool[cacheKey]) questionPool[cacheKey] = [];
    questionPool[cacheKey].push(...questions.slice(questionsCount));
  }

  res.json({ questions: questions.slice(0, questionsCount) });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Drucker game running on port ${PORT}`);
});
