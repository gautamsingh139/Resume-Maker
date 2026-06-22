# CareerLaunch AI

CareerLaunch AI is a free, browser-based student resume builder and resume analyzer for students, freshers, internship seekers, and early job applicants.

## Project structure

```text
CareerLaunch AI/
├── index.html   # App layout and sections
├── styles.css   # Responsive light/dark UI and resume templates
├── app.js       # Builder, analyzer, local storage, generators, PDF workflow
└── README.md    # Setup and feature notes
```

## Features

- Resume builder with personal info, photo upload, objective, education, skills, projects, certifications, internships, achievements, languages, hobbies, and references.
- Templates: Modern, ATS-friendly, Minimal, Professional, Internship, and Fresher.
- Resume analyzer with PDF upload, pasted text analysis, ATS score, strength score, weak sections, missing skills, and keyword suggestions.
- Student tools: cover letter generator, career objective generator, role-based skill suggestions, interview tips, resume checklist, AI suggestions, and progress tracker.
- Dashboard with local storage for multiple resumes, edit, duplicate, delete, completion tracking, and PDF download through the browser print dialog.
- Responsive UI with dark mode, cards, animations, and simple navigation.

## How to run

Open `index.html` in a browser. No installation, paid API, or backend is required.

## PDF generation

Use the **Download PDF** button. The browser print dialog will open with only the resume preview visible. Choose **Save as PDF**.

## Backend suggestions

The current app is intentionally free and local-first. A backend is optional. If you later want cloud accounts or stronger AI analysis, add:

- Authentication with Firebase Auth, Supabase Auth, or your own Node/Express service.
- Database storage with Firestore, Supabase Postgres, or MongoDB.
- PDF parsing with a server-side library such as `pdf-parse`.
- AI suggestions through an API route so keys are never exposed in frontend code.
- File storage for profile photos and resume versions.

## Step-by-step explanation

1. The user enters resume details in the builder form.
2. JavaScript collects all fields and renders a live resume preview.
3. Template buttons switch CSS classes on the preview.
4. Completion percentage is calculated from important resume sections.
5. Saving stores the resume in browser local storage.
6. Dashboard cards load, duplicate, edit, or delete saved resumes.
7. PDF download uses the browser print dialog with print-specific CSS.
8. Analyzer reads pasted text or rough extracted PDF text and checks role keywords, sections, metrics, contact details, ATS compatibility, and overall strength.
9. Student tools generate a role-specific objective, cover letter draft, skill suggestions, checklist, and interview guidance.