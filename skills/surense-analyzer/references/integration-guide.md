# integration-guide.md
# מדריך שילוב — איפה הסקיל יושב במערכת
# SPARK AI | v2.0

---

## ארכיטקטורה כללית

```
[משתמש מעלה Excel]
        ↓
[parseReport.ts]
  — קורא 6 גיליונות
  — מקבץ לפי ת.ז
  — anonymize (hash + שם מקוצר)
  — מחזיר JSON נקי
        ↓
[POST /api/analyze]
  system: SKILL.md זה  ← כאן הסקיל
  user:   JSON מ-parseReport
        ↓
[Claude מנתח]
  — 16 טריגרים
  — JSON מובנה
        ↓
[נשמר ב-DB]
  db.reports.analysis
        ↓
┌──────────────────────────────┐
│  Dashboard  ← kpis           │
│  Composer   ← flagDetails    │
│  Briefing   ← urgent list    │
│  Q&A        ← analysis מלא  │
└──────────────────────────────┘
```

---

## Prompt 2 — Analysis (הסקיל)

```typescript
// server/routers.ts או server/api/analyze.ts

import { readFileSync } from 'fs'
import { join } from 'path'

const SKILL_CONTENT = readFileSync(
  join(__dirname, '../skills/surense-analyzer/SKILL.md'),
  'utf-8'
)

router.post('/analyze', async (req, res) => {
  const { parsedData, workspaceId } = req.body
  const today = new Date().toISOString().split('T')[0]

  const systemPrompt = SKILL_CONTENT
    .replace('{TODAY}', today)

  const result = await invokeLLM({
    system: systemPrompt,
    prompt: JSON.stringify(parsedData),
    maxTokens: 4000,
  })

  const analysis = JSON.parse(result)

  // שמור ב-DB — לא מנתחים שוב
  await db.reports.upsert({
    workspace_id: workspaceId,
    analysis,
    report_date: today,
    created_at:  new Date(),
  })

  res.json({ success: true, kpis: analysis.kpis })
})
```

---

## Prompt 3 — AI Composer

```typescript
// מחובר ל-flagDetails שה-DB מחזיר

router.post('/compose', async (req, res) => {
  const { flag, flagDetail, channel,
          firstName, age, ageGroup,
          agentName, productName, company } = req.body

  const result = await invokeLLM({
    system: COMPOSER_SYSTEM,           // מ-prompts.ts
    prompt: buildComposerPrompt({...}), // מ-prompts.ts
    maxTokens: 300,
  })

  res.json({ message: result })
})
```

---

## Prompt 4 — Daily Briefing

```typescript
// קורא מה-DB — לא מנתח שוב!

router.get('/briefing', async (req, res) => {
  const analysis = await db.reports.findLatest(workspaceId)

  const result = await invokeLLM({
    system: BRIEFING_SYSTEM,
    prompt: buildBriefingPrompt({
      today:     new Date().toLocaleDateString('he-IL'),
      agentName: req.user.name,
      kpis:      analysis.kpis,
      urgentList: [
        ...analysis.critical,
        ...analysis.urgent,
      ].slice(0, 10),
    }),
    maxTokens: 1000,
  })

  res.json({ briefing: result })
})
```

---

## Prompt 5 — Client Summary

```typescript
// לחצן "הכן לפגישה" בדף לקוח

router.post('/client-summary', async (req, res) => {
  const client = await db.clients.findById(req.body.clientId)

  const result = await invokeLLM({
    system: CLIENT_SUMMARY_SYSTEM,
    prompt: buildClientSummaryPrompt(client),
    maxTokens: 800,
  })

  res.json({ summary: result })
})
```

---

## Prompt 6 — Smart Q&A

```typescript
// chat panel פתוח

router.post('/qa', async (req, res) => {
  const analysis = await db.reports.findLatest(workspaceId)

  const result = await invokeLLM({
    system: QA_SYSTEM,
    prompt: buildQAPrompt({
      reportSummary: analysis.kpis,
      question:      req.body.question,
    }),
    maxTokens: 500,
  })

  res.json({ answer: result })
})
```

---

## מבנה התיקיות בפרויקט

```
/skills/
  surense-analyzer/
    SKILL.md                    ← System Prompt ל-Prompt 2
    references/
      field-reference.md        ← מיפוי שדות (תיעוד פנימי)
      appointment-law.md        ← רקע חוקי
      triggers-reference.md     ← 16 טריגרים — טבלת עזר
      integration-guide.md      ← מדריך זה
  roeto-analyzer/
    SKILL.md
    references/

/server/
  prompts.ts                    ← כל הפרומפטים (Composer, Briefing...)
  routers.ts                    ← endpoints
  parseReport.ts                ← parser (קרוא skills רק בשרת)
  parseReport.test.ts           ← טסטי יחידה לפרסר
  parseReport.fixture.test.ts   ← טסט רגרסיה מול fixture מלא (snapshot)
  __fixtures__/
    surense-demo-04-2026.xlsx   ← דוח דמו סינתטי, תאום-מבנה (41/32/28/30), כל טריגר נדלק
  __snapshots__/
    parseReport.fixture.test.ts.snap  ← KPIs נעולים — שובר build אם מספר משתנה

/client/src/
  lib/
    parseReport.ts              ← client-side parser (אם client-side)
  components/
    AIChatBox.tsx               ← Prompt 6 Q&A
    AIComposer.tsx              ← Prompt 3 Composer
```

---

## סדר הפעולות בזמן ריצה

```
1. סוכן מעלה Excel                    → client
2. parseReport.ts                      → client/server
3. POST /api/classify (Prompt 1)       → server → Claude → "surense"
4. POST /api/analyze  (Prompt 2 + SKILL.md) → server → Claude → JSON
5. שמור ב-DB                           → server
6. Dashboard מתרענן                    → client קורא מ-DB
7. [on-demand] POST /api/compose       → server → Claude → הודעה
8. [on-demand] GET /api/briefing       → server → Claude → משימות
9. [on-demand] POST /api/client-summary → server → Claude → סיכום
10. [on-demand] POST /api/qa           → server → Claude → תשובה
```

---

## עלויות טוקנים משוערות (Claude Sonnet)

| Prompt | קלט | פלט | עלות משוערת |
|---|---|---|---|
| P1 Classification | ~200 | ~100 | $0.001 |
| P2 Analysis | ~12,000 | ~4,000 | $0.05 |
| P3 Composer | ~800 | ~300 | $0.003 |
| P4 Briefing | ~2,000 | ~1,000 | $0.009 |
| P5 Client Summary | ~1,500 | ~800 | $0.007 |
| P6 Q&A | ~5,000 | ~500 | $0.016 |
| **סה"כ לניתוח** | | | **~$0.05** |
| **סה"כ עם כל on-demand** | | | **~$0.09** |

P2 רץ פעם אחת — כל השאר קוראים מה-DB.

---

## שער רגרסיה — בקרת איכות לפרסר

לפני כל merge ל-main, `pnpm test` חייב לעבור. שתי שכבות הגנה:

1. **טסטי יחידה** (`parseReport.test.ts`) — בודקים פונקציות בודדות: `toDate` (כולל Excel serial), נרמול מעמד/סטטוס, חישוב `appointmentDaysRemaining`.
2. **טסט fixture + snapshot** (`parseReport.fixture.test.ts`) — מריץ את הפרסר על דוח דמו מלא (150 לקוחות, תאום-מבנה לדוח אמיתי 04/2026) ונועל את ערכי ה-KPIs ב-snapshot. כל שינוי קוד עתידי שמשנה תוצאה עסקית — שובר את ה-build ומחייב סקירה.

הדמו סינתטי לחלוטין (ת.ז 2000000xx, מיילים demo-data.co.il) ומהונדס כך שכל 16 הטריגרים נדלקים — כך אפשר לאמת ש-`parseReport` מזין כל טריגר בלי לגעת בנתוני לקוח אמיתיים. **לעדכון ה-snapshot במכוון:** `pnpm test -u` (ורק אחרי אימות שהשינוי בערכים מכוון).

עיקרון כללי (חוצה-תעשיות): fixture מהונדס + snapshot הוא שער איכות שמתאים לכל מנוע חוקים מבוסס-נתונים — מ-"תוקן" ל-"חי" בלי רגרסיה שקטה ל-production.
