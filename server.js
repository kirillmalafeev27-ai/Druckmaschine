const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL_NAME = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const questionPool = Object.create(null);

function isValidQuestion(question) {
  return Boolean(
    question &&
      typeof question.text === 'string' &&
      typeof question.display === 'string' &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      typeof question.correct === 'number' &&
      question.correct >= 0 &&
      question.correct <= 3
  );
}

function buildTaskDescription({
  questionsCount,
  lexicalTopic,
  grammarTopic,
  isWortstellung,
}) {
  if (isWortstellung) {
    return `Создай ${questionsCount} упражнений на порядок слов (Wortstellung) в немецком языке.
Грамматическая тема: ${grammarTopic}.
${lexicalTopic ? `Лексическая тема: ${lexicalTopic}. Все предложения должны использовать слова из этой темы.` : ''}
Формат:
- text: инструкция на русском языке.
- display: немецкие слова или фразы через " / " в перемешанном порядке.
- options: 4 полных немецких предложения.

Критично:
- display обязан быть перемешан и не может совпадать с правильным ответом.
- У задания должен быть ровно один правильный вариант.
- Если инверсия тоже грамматически правильна, не используй её как ошибочный вариант.
- Неправильные варианты должны содержать реальную ошибку порядка слов.
- Все предложения должны быть разными и естественными.`;
  }

  return `Создай ${questionsCount} упражнений по немецкой грамматике.
Грамматическая тема: ${grammarTopic}.
${lexicalTopic ? `Лексическая тема: ${lexicalTopic}. Все предложения должны использовать слова из этой темы.` : ''}
Формат:
- text: инструкция на русском языке.
- display: немецкое предложение с пропуском ___.
- options: 4 варианта на немецком языке.

Критично:
- У задания должен быть ровно один правильный вариант.
- Неправильные варианты должны содержать одну ясную грамматическую ошибку.
- Все предложения должны быть разными и естественными.`;
}

function buildPrompt({
  level,
  lexicalTopic,
  grammarTopic,
  isWortstellung,
  questionsCount,
  exclude,
}) {
  const excludeNote =
    exclude && exclude.length
      ? `\nНе используй эти display-предложения: ${exclude
          .slice(-10)
          .map((item) => `"${item}"`)
          .join(', ')}`
      : '';

  const taskDescription = buildTaskDescription({
    questionsCount,
    lexicalTopic,
    grammarTopic,
    isWortstellung,
  });

  return `Ты — опытный преподаватель немецкого языка. Создаёшь упражнения для учеников.

${taskDescription}

Уровень CEFR: ${level}. Строго соблюдай уровень. Не используй грамматику и лексику выше ${level}.
${excludeNote}

Критические правила:
1. Правильный ответ должен быть безупречно грамматическим.
2. Каждое предложение должно быть полным и завершённым по смыслу.
3. Неправильные варианты не должны быть абсурдными.
4. correct — индекс правильного ответа от 0 до 3.
5. Распределяй правильные ответы по позициям равномерно.
6. Все ${questionsCount} заданий должны быть уникальными.
7. Используй живые, учебно-естественные предложения.

Ответь только валидным JSON-массивом без markdown и без пояснений:
[{"text":"Инструкция на русском","display":"Немецкий текст","options":["A","B","C","D"],"correct":0}]`;
}

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/generate-questions', async (req, res) => {
  const { level, lexicalTopic, grammarTopic, isWortstellung, count, exclude } = req.body || {};

  if (!level || !grammarTopic) {
    return res.status(400).json({ error: 'level and grammarTopic are required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const questionsCount = Math.max(1, Math.min(50, Number(count) || 30));
  const cacheKey = `${level}:${grammarTopic}:${lexicalTopic || ''}:${isWortstellung ? 'w' : 'g'}`;

  if (questionPool[cacheKey] && questionPool[cacheKey].length >= questionsCount) {
    const cached = questionPool[cacheKey].splice(0, questionsCount);
    return res.json({ questions: cached });
  }

  try {
    const prompt = buildPrompt({
      level,
      lexicalTopic,
      grammarTopic,
      isWortstellung,
      questionsCount,
      exclude,
    });

    const message = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content?.[0]?.text?.trim() || '[]';
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    const validQuestions = parsed.filter(isValidQuestion);

    if (validQuestions.length > questionsCount) {
      questionPool[cacheKey] = questionPool[cacheKey] || [];
      questionPool[cacheKey].push(...validQuestions.slice(questionsCount));
    }

    return res.json({ questions: validQuestions.slice(0, questionsCount) });
  } catch (error) {
    console.error('Question generation failed:', error);
    return res.status(500).json({
      error: 'Failed to generate questions',
      detail: error.message,
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Drucker game running on port ${PORT}`);
});
