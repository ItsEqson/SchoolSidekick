After each save point, push it to GitHub.

OpenAI model: `gpt-5.6-luna`

## How to run it

Run `npm start` and open http://127.0.0.1:4173.
The AI key comes from the server-only `getKey()` function in `keygen.js`, which requests it from MindDo.
Set `KEYGEN_URL` and `KEYGEN_TOKEN` in the ignored `.env` file, then restart the server. Never put credentials in chat or browser code.
The server caches the key until its ISO 8601 `expiresAt` timestamp and shares in-flight lookups. If OpenAI rejects it, the server clears it and makes one refresh and one retry; it never retries in a loop.
MindDo failures display `error.message` to the user and log `error.fix` only on the server. Keys and tokens are never returned to the page or logged.

## How to put it online with Vercel

1. In Vercel, choose **Add New → Project** and import the GitHub repository `ItsEqson/SchoolSidekick`.
2. Under **Environment Variables**, add `KEYGEN_URL` and `KEYGEN_TOKEN` with your MindDo settings. Enable them for **Production**, and for **Preview** if you want AI to work on preview deployments too. These are server-only variables; do not use a public/client prefix.
3. Click **Deploy**. The repository already sets the framework, static folder, page routes, and AI function. Keep the root directory at the repository root.
4. Open the Vercel URL and try **Homework helper → Try an example → Get a hint**. If you add or change the MindDo settings after deploying, redeploy.

Saved work and calendar events stay in the browser. The online site starts with its own saved work, separate from the local preview.

## What's done

- Student page: homework hints, a calendar, study guides and practice, class notes, essay feedback, and a school chatbot.
- Homework helper gives numbered hints, a similar worked example, and an optional **Picture it** section with fraction bars or a simple labeled text diagram. It ends with **Your turn** and leaves the homework answer for the student. To try it, enter “How should I start adding 2/3 and 3/4? Please show a visual.” and click **Get a hint**.
- Teacher page: short writing feedback, one-day lesson plans, and activities and tests with a collapsible answer key. Remove student details before submitting work and review drafts before use.
- Save responses and calendar events in your browser. Saves on this computer only for now
- Both pages are available on the local preview. They organize tools and saved work by role, with no separate accounts or sign-in.
- AI tools answer within their own purpose and redirect unrelated requests. The calendar saves events without using AI.

## What's next

Try sample school questions and review the replies with a teacher before recording the demo.

## MVP 1 check — November 20, 2026

Homework helper works with the configured MindDo key service and real OpenAI replies. Checked through the local HTTP server: algebra and science questions returned numbered hints; an unrelated shopping request was redirected. The fraction-addition check also returned hints without the final answer. Practice questions and teacher lesson plans were checked as well.

To try it in two steps:
1. Run `npm start`, open http://127.0.0.1:4173/student, and choose **Homework helper**.
2. Type a school question (or click **Try an example**), then click **Get a hint**.

Run `npm test` to check key caching, expiry, service errors, and the single refresh/retry after a rejected key. Credentials remain in the ignored `.env` file. The local page loaded in Chrome; automated button-click verification was interrupted by the computer-use browser URL check.

## Hints, examples, and visuals — November 20, 2026

- Homework replies now have separate Hint, A similar example, optional Picture it, and Your turn sections. Visuals illustrate the similar example or concept. Fraction bars are drawn by the app from bounded numeric counts, with a text description for screen readers; other diagrams use plain text. AI text is never inserted as HTML.
- Saved homework replies reopen with the same sections and diagrams. Older saves, teacher answer keys, and calendar data keep their existing format.
- Verified in the browser with a real fraction question, including saving, reloading, and reopening the visual reply at a narrow screen width. Live server checks also passed for algebra, science, bullying refusal, off-topic redirection, practice, lesson plans, and original tests with answer keys. All 11 automated tests passed with `npm test`.

## MVP 2 check — November 20, 2026

Practice questions work. The initial browser check found that math was displayed as raw LaTeX commands. Updated the Studying instructions to use readable plain text, with Quick review, Example, and Practice questions sections. Students receive 3–5 original questions without practice answers; the example is separate. A missing topic prompts a clarification question.

To try it in two steps:
1. Open the student workspace and choose **Studying**.
2. Enter a topic (or click **Try an example**), then click **Start studying**.

Verified real replies for fractions, one-step equations, the water cycle, and nouns and verbs. All four returned 3–5 questions with readable formatting. Checked missing-topic clarification and off-topic redirection. In the browser, generated fraction practice, saved it, reloaded, and reopened it successfully. Homework hints and teacher lesson plans passed live checks; all 11 automated tests passed. Answer checking remains a later feature.

## Maybe Later

- The user can check practice answers and see explanations for mistakes.
- The user can press a Report this answer button on any AI reply.
- The user can, as a teacher, edit an AI lesson plan before using it.
- The user can choose a subject and grade level before asking questions.
- The user can, as a teacher, get grading ideas for a pasted student answer. The current improvement tool gives feedback without assigning a grade.
- The user can print a lesson plan or practice test.
