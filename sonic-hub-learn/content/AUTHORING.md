# Authoring learn content

Content is plain YAML, Markdown and HTML in git. `npm run content:check` validates it; on push to `main`, CI runs `content:sync` to load it into the database and upload media. JSON Schemas for every file type are in `_schema/`.

## Layout

```
<subject>/subject.yaml                      id = folder name; prefix for item ids (en, aws)
<subject>/theme.css                         optional: --subject-* CSS variables for lessons and slides
<subject>/courses/<course>/course.yaml      id = folder name, globally unique
<course>/<NN-chapter>/chapter.yaml          chapters can nest
<chapter>/<NN-lesson>.md                    lesson text; frontmatter: title, summary, video
<chapter>/<NN-lesson>.items.yaml            the lesson's items and questions
<chapter>/<NN-lesson>.slides.html           optional animated slides
<chapter>/media/                            png/jpg (become WebP), svg, mp3, mp4
```

Folders and files are ordered by their numeric prefix. A lesson can be any mix of the three files.

## Rules

- **One course per textbook or source.** Record where it comes from in `source.type`: `self`, `book`, `website` or `online-course`, plus name/author/publisher/url.
- **Item ids are global:** `<prefix>.<slug>`, e.g. `en.deadline`, `aws.s3.storage-classes`. Declare an item once; reuse it anywhere with `- ref: <id>`, optionally adding a course-specific `note`, `examples` or `questions`. Same word with a different meaning → a different id (`en.run.manage`).
- **Answers belong to the item, not the course**, so a review in one course counts in every course that has the item. Each course still schedules with its own `policy`.
- **Vocab is data only:** term, pronunciation, pos, meaning, definition, and examples with a `{{c1::...}}` cloze. Recognize / recall / use / listen questions are generated from it. Author questions only for what generators cannot ask.
- **Options:** mark the right ones with `correct: true` (never by index) and give every option a `why`.
- **Cloze:** `{{c1::answer}}`, alternatives `{{c1::answer|other form}}`, hint `{{c1::answer::hint}}`.
- `course_only: true` keeps a question inside the course whose file declares it.
- **Exams:** `exam.domains[].tag` matches tags on a question, or on its item.
- **Collection courses** link items from other courses: `include: [{ courses: [...], kinds: [vocab], tags: [...] }]`, refreshed on every sync.
- Keep a file under ~100 items. Media paths are relative to the file that uses them.
- For courses based on a published book, follow the book's units, but write items, explanations and questions in your own words — do not copy reading passages or dialogues.

## Question types

| type | needs |
|---|---|
| `single` / `multi` | `options` with `correct: true` |
| `true_false` | `answer: true\|false` |
| `typing` | `answers` (canonical first; small typos are tolerated) |
| `cloze` | blanks in `prompt` |
| `order` | `options` listed in the correct order |
| `match` | `options`, each with `match` |
| `flashcard` | `back` |

Facets: vocab `recognize`, `recall`, `use`, `listen`; grammar/concept `recall`, `apply`. A question's `facet` defaults to `use` (vocab) or `apply`.

## Slides

Each `<section>` is one slide; elements with `class="step"` appear one tap at a time. A `<style>` block is scoped to its deck, and the subject's `--subject-*` variables are available.

## Commands (from `sonic-hub-learn/`)

```
npm run content:check                      # validate; no database needed
npm run content:sync -- --media local      # load into DATABASE_URL, media into .media/
npm run schema:export                      # refresh _schema/ after changing shared/src/content.ts
```
