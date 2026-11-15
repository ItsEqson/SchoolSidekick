After each save point, push it to GitHub.

OpenAI model: `gpt-5.6-luna`

## How to run it

Run `npm start` and open http://127.0.0.1:4173.
The local server reads the OpenAI key from `.env`.
If OpenAI rejects the key, replace it in `.env` and try again.

## What's done

- Student page: homework hints, a calendar, study guides and practice, class notes, essay feedback, and a school chatbot.
- Teacher page: short writing feedback, one-day lesson plans, and activities and tests with a collapsible answer key. Remove student details before submitting work and review drafts before use.
- Save responses and calendar events in your browser. Saves on this computer only for now
- Both pages are available on the local preview. They organize tools and saved work by role, with no separate accounts or sign-in.
- AI tools answer within their own purpose and redirect unrelated requests. The calendar saves events without using AI.

## What's next

Try sample school questions and review the replies with a teacher before recording the demo.

## Maybe Later

- The user can check practice answers and see explanations for mistakes.
- The user can press a Report this answer button on any AI reply.
- The user can, as a teacher, edit an AI lesson plan before using it.
- The user can choose a subject and grade level before asking questions.
- The user can, as a teacher, get grading ideas for a pasted student answer. The current improvement tool gives feedback without assigning a grade.
- The user can print a lesson plan or practice test.
