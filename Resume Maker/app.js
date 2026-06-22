const STORAGE_KEY = "careerlaunch-resumes";
const THEME_KEY = "careerlaunch-theme";

const state = {
  currentId: null,
  template: "modern",
  photo: "",
};

const roleSkills = {
  frontend: ["HTML", "CSS", "JavaScript", "React", "Responsive Design", "Git", "UI Accessibility"],
  backend: ["Node.js", "Express", "SQL", "REST APIs", "Authentication", "Git", "Testing"],
  data: ["Excel", "SQL", "Python", "Power BI", "Statistics", "Data Cleaning", "Dashboards"],
  marketing: ["SEO", "Content Writing", "Canva", "Analytics", "Social Media", "Email Campaigns"],
  hr: ["Recruitment", "Communication", "MS Excel", "Employee Engagement", "Documentation"],
  default: ["Communication", "Problem Solving", "Teamwork", "Time Management", "MS Office", "Research"],
};

const sectionConfig = {
  education: [
    ["degree", "Degree / Course"],
    ["institution", "Institution"],
    ["year", "Year / CGPA"],
    ["details", "Highlights"],
  ],
  projects: [
    ["title", "Project title"],
    ["tools", "Tools used"],
    ["details", "Impact / description"],
  ],
  certifications: [
    ["name", "Certification name"],
    ["issuer", "Issuer"],
    ["year", "Year"],
  ],
  internships: [
    ["role", "Role"],
    ["company", "Company"],
    ["duration", "Duration"],
    ["details", "Responsibilities / impact"],
  ],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// Bootstraps the local-first app and restores saved preferences.
function init() {
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  Object.keys(sectionConfig).forEach((section) => addRow(section));
  wireEvents();
  renderChecklist();
  renderDashboard();
  updateAll();
}

function wireEvents() {
  $("#themeToggle").addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });

  $("#resumeForm").addEventListener("input", updateAll);
  $("#targetRole").addEventListener("input", updateAiSuggestion);

  $("#photoUpload").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.photo = reader.result;
      updateAll();
    };
    reader.readAsDataURL(file);
  });

  $$(".template-choice").forEach((button) => {
    button.addEventListener("click", () => {
      state.template = button.dataset.template;
      $$(".template-choice").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      updateAll();
    });
  });

  $$(".add-row").forEach((button) => {
    button.addEventListener("click", () => addRow(button.closest(".repeater").dataset.section));
  });

  $("#suggestSkills").addEventListener("click", fillSuggestedSkills);
  $("#objectiveBtn").addEventListener("click", fillObjective);
  $("#saveResume").addEventListener("click", saveResume);
  $("#downloadPdf").addEventListener("click", () => window.print());
  $("#clearForm").addEventListener("click", clearForm);
  $("#analyzeBtn").addEventListener("click", analyzeResume);
  $("#pdfUpload").addEventListener("change", readPdfRoughText);
  $("#coverBtn").addEventListener("click", generateCoverLetter);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

// Repeatable resume sections use the same row factory to keep editing consistent.
function addRow(section, values = {}) {
  const container = document.querySelector(`[data-section="${section}"] .rows`);
  if (!container) return;
  const row = document.createElement("div");
  row.className = "entry-row";
  row.dataset.section = section;
  row.innerHTML = sectionConfig[section].map(([key, label]) => `
    <label>${label}
      <input data-key="${key}" type="text" value="${escapeAttr(values[key] || "")}" placeholder="${label}" />
    </label>
  `).join("") + `
    <div class="entry-actions">
      <button class="ghost-button remove-row" type="button">Remove</button>
    </div>
  `;
  row.querySelector(".remove-row").addEventListener("click", () => {
    row.remove();
    updateAll();
  });
  row.addEventListener("input", updateAll);
  container.appendChild(row);
}

// Converts the current form state into one serializable resume object.
function collectData() {
  const form = $("#resumeForm");
  const formData = new FormData(form);
  const data = {
    id: state.currentId,
    name: $("#resumeName").value.trim() || "Untitled Resume",
    targetRole: $("#targetRole").value.trim(),
    template: state.template,
    photo: state.photo,
    personal: Object.fromEntries(["fullName", "email", "phone", "location", "linkedin", "portfolio"].map((key) => [key, formData.get(key)?.trim() || ""])),
    objective: formData.get("objective")?.trim() || "",
    skills: formData.get("skills")?.trim() || "",
    achievements: formData.get("achievements")?.trim() || "",
    languages: formData.get("languages")?.trim() || "",
    hobbies: formData.get("hobbies")?.trim() || "",
    references: formData.get("references")?.trim() || "",
  };

  Object.keys(sectionConfig).forEach((section) => {
    data[section] = $$(`[data-section="${section}"] .entry-row`).map((row) => {
      const item = {};
      row.querySelectorAll("input").forEach((input) => {
        item[input.dataset.key] = input.value.trim();
      });
      return item;
    }).filter((item) => Object.values(item).some(Boolean));
  });

  return data;
}

function updateAll() {
  const data = collectData();
  renderResume(data);
  updateCompletion(data);
  updateAiSuggestion();
}

// Rebuilds the printable resume preview whenever the user edits content.
function renderResume(data) {
  const paper = $("#resumePaper");
  paper.className = `resume-paper template-${data.template}`;
  const photo = data.photo ? `<img class="profile-photo" src="${data.photo}" alt="Profile photo" />` : "";
  const contact = [data.personal.email, data.personal.phone, data.personal.location, data.personal.linkedin, data.personal.portfolio].filter(Boolean).join(" | ");
  paper.innerHTML = `
    <header class="resume-header">
      <div>
        <h2>${escapeHtml(data.personal.fullName || "Your Name")}</h2>
        <p class="contact-line">${escapeHtml(contact || "email | phone | location | links")}</p>
        ${data.targetRole ? `<p class="contact-line">${escapeHtml(data.targetRole)}</p>` : ""}
      </div>
      ${photo}
    </header>
    ${section("Career Objective", data.objective)}
    ${listSection("Education", data.education, (item) => itemBlock(item.degree, item.institution, item.year, item.details))}
    ${skillsSection(data.skills)}
    ${listSection("Projects", data.projects, (item) => itemBlock(item.title, item.tools, "", item.details))}
    ${listSection("Certifications", data.certifications, (item) => itemBlock(item.name, item.issuer, item.year, ""))}
    ${listSection("Internships", data.internships, (item) => itemBlock(item.role, item.company, item.duration, item.details))}
    ${section("Achievements", data.achievements)}
    ${section("Languages", data.languages)}
    ${section("Hobbies and Interests", data.hobbies)}
    ${section("References", data.references)}
  `;
}

function section(title, content) {
  if (!content) return "";
  return `<section class="resume-section"><h3>${title}</h3><p>${escapeHtml(content)}</p></section>`;
}

function listSection(title, items, renderItem) {
  if (!items?.length) return "";
  return `<section class="resume-section"><h3>${title}</h3>${items.map(renderItem).join("")}</section>`;
}

function itemBlock(title, subtitle, meta, details) {
  return `
    <div class="resume-item">
      <strong>${escapeHtml(title || "")}</strong>
      <small>${escapeHtml([subtitle, meta].filter(Boolean).join(" | "))}</small>
      ${details ? `<p>${escapeHtml(details)}</p>` : ""}
    </div>
  `;
}

function skillsSection(skills) {
  const items = skills.split(",").map((skill) => skill.trim()).filter(Boolean);
  if (!items.length) return "";
  return `<section class="resume-section"><h3>Skills</h3><div class="skill-pills">${items.map((skill) => `<span>${escapeHtml(skill)}</span>`).join("")}</div></section>`;
}

// Completion favors sections recruiters expect in student and fresher resumes.
function updateCompletion(data) {
  const checks = [
    data.personal.fullName, data.personal.email, data.personal.phone, data.objective,
    data.education.length, data.skills, data.projects.length, data.certifications.length,
    data.internships.length, data.achievements, data.languages, data.hobbies,
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  $("#completionText").textContent = `${score}%`;
  $("#completionBar").value = score;
}

function getSkillSet(role) {
  const normalized = role.toLowerCase();
  if (normalized.includes("front") || normalized.includes("web")) return roleSkills.frontend;
  if (normalized.includes("back") || normalized.includes("server")) return roleSkills.backend;
  if (normalized.includes("data") || normalized.includes("analyst")) return roleSkills.data;
  if (normalized.includes("market")) return roleSkills.marketing;
  if (normalized.includes("hr") || normalized.includes("human")) return roleSkills.hr;
  return roleSkills.default;
}

function fillSuggestedSkills() {
  const role = $("#targetRole").value || "student";
  const current = document.querySelector("[name='skills']").value;
  const merged = [...new Set([...current.split(",").map((item) => item.trim()).filter(Boolean), ...getSkillSet(role)])];
  document.querySelector("[name='skills']").value = merged.join(", ");
  updateAll();
}

function fillObjective() {
  const role = $("#targetRole").value || "entry-level role";
  const skills = getSkillSet(role).slice(0, 3).join(", ");
  document.querySelector("[name='objective']").value = `Motivated student seeking a ${role} opportunity to apply ${skills} while contributing to real projects, learning from experienced teams, and building measurable outcomes.`;
  updateAll();
}

function updateAiSuggestion() {
  const role = $("#targetRole").value.trim();
  if (!role) return;
  $("#aiSuggestion").textContent = `For ${role}, highlight ${getSkillSet(role).slice(0, 4).join(", ")}. Add numbers to projects, include tools used, and keep the first page focused on education, skills, internships, and projects.`;
}

function saveResume() {
  const resumes = getSavedResumes();
  const data = collectData();
  data.id = state.currentId || crypto.randomUUID();
  data.updatedAt = new Date().toISOString();
  state.currentId = data.id;
  const next = [data, ...resumes.filter((resume) => resume.id !== data.id)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  renderDashboard();
}

function getSavedResumes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function renderDashboard() {
  const resumes = getSavedResumes();
  const list = $("#resumeList");
  if (!resumes.length) {
    list.innerHTML = `<div class="dashboard-card"><h3>No saved resumes yet</h3><p>Save your first resume from the builder to see it here.</p></div>`;
    return;
  }
  list.innerHTML = resumes.map((resume) => `
    <article class="dashboard-card">
      <h3>${escapeHtml(resume.name)}</h3>
      <p>${escapeHtml(resume.targetRole || "No target role")}<br />Updated ${new Date(resume.updatedAt).toLocaleDateString()}</p>
      <div class="dashboard-actions">
        <button class="small-button" type="button" data-action="edit" data-id="${resume.id}">Edit</button>
        <button class="small-button" type="button" data-action="copy" data-id="${resume.id}">Duplicate</button>
        <button class="small-button" type="button" data-action="delete" data-id="${resume.id}">Delete</button>
      </div>
    </article>
  `).join("");
  list.querySelectorAll("button").forEach((button) => button.addEventListener("click", handleDashboardAction));
}

function handleDashboardAction(event) {
  const { action, id } = event.target.dataset;
  const resumes = getSavedResumes();
  const resume = resumes.find((item) => item.id === id);
  if (!resume) return;
  if (action === "edit") loadResume(resume);
  if (action === "copy") {
    const copy = { ...resume, id: crypto.randomUUID(), name: `${resume.name} Copy`, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([copy, ...resumes]));
    renderDashboard();
  }
  if (action === "delete") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes.filter((item) => item.id !== id)));
    renderDashboard();
  }
}

function loadResume(data) {
  state.currentId = data.id;
  state.template = data.template || "modern";
  state.photo = data.photo || "";
  $("#resumeName").value = data.name || "";
  $("#targetRole").value = data.targetRole || "";
  Object.entries(data.personal || {}).forEach(([key, value]) => {
    const input = document.querySelector(`[name="${key}"]`);
    if (input) input.value = value;
  });
  ["objective", "skills", "achievements", "languages", "hobbies", "references"].forEach((key) => {
    const input = document.querySelector(`[name="${key}"]`);
    if (input) input.value = data[key] || "";
  });
  Object.keys(sectionConfig).forEach((section) => {
    const rows = document.querySelector(`[data-section="${section}"] .rows`);
    rows.innerHTML = "";
    (data[section]?.length ? data[section] : [{}]).forEach((item) => addRow(section, item));
  });
  $$(".template-choice").forEach((button) => button.classList.toggle("active", button.dataset.template === state.template));
  updateAll();
  location.hash = "builder";
}

function clearForm() {
  state.currentId = null;
  state.photo = "";
  $("#resumeForm").reset();
  Object.keys(sectionConfig).forEach((section) => {
    document.querySelector(`[data-section="${section}"] .rows`).innerHTML = "";
    addRow(section);
  });
  updateAll();
}

// Browser-only PDF extraction is intentionally lightweight; pasted text gives best accuracy.
async function readPdfRoughText(event) {
  const file = event.target.files[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buffer);
  $("#resumeText").value = text.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").slice(0, 12000);
}

// Scores are heuristic and transparent so the app remains free without external AI APIs.
function analyzeResume() {
  const text = $("#resumeText").value.toLowerCase();
  const role = $("#analyzeRole").value || $("#targetRole").value || "student role";
  const requiredSkills = getSkillSet(role);
  const sections = ["education", "skills", "project", "internship", "certification", "achievement"];
  const foundSections = sections.filter((sectionName) => text.includes(sectionName));
  const missingSkills = requiredSkills.filter((skill) => !text.includes(skill.toLowerCase()));
  const hasMetrics = /\d+%|\d+\+|\b\d+\b/.test(text);
  const hasContact = /@|\+?\d[\d\s-]{7,}/.test(text);
  const atsScore = Math.max(35, Math.round(100 - missingSkills.length * 7 - (hasContact ? 0 : 12) - (text.includes("table") ? 8 : 0)));
  const strengthScore = Math.min(100, Math.round(foundSections.length * 12 + (hasMetrics ? 18 : 0) + (text.length > 1200 ? 14 : 0)));
  const weakSections = sections.filter((sectionName) => !foundSections.includes(sectionName));

  $("#analysisOutput").innerHTML = `
    <div class="score-row">
      <div class="score-card"><span>ATS score</span><strong>${atsScore}</strong></div>
      <div class="score-card"><span>Strength</span><strong>${strengthScore}</strong></div>
      <div class="score-card"><span>Found sections</span><strong>${foundSections.length}/${sections.length}</strong></div>
    </div>
    <h3>Missing skills</h3>
    <p>${missingSkills.length ? missingSkills.join(", ") : "Great coverage for the selected role."}</p>
    <h3>Weak sections</h3>
    <p>${weakSections.length ? weakSections.join(", ") : "Core resume sections are present."}</p>
    <h3>Suggested improvements</h3>
    <ul class="suggestion-list">
      <li>Add measurable results to projects and internships.</li>
      <li>Use role keywords naturally in skills, projects, and summary.</li>
      <li>Keep formatting simple for ATS: clear headings, no heavy graphics for ATS submissions.</li>
      <li>Place education, skills, projects, and internship experience near the top for student resumes.</li>
    </ul>
    <h3>Keyword suggestions</h3>
    <p>${requiredSkills.join(", ")}</p>
  `;
}

function generateCoverLetter() {
  const data = collectData();
  const company = $("#companyName").value || "the company";
  const role = data.targetRole || "the open role";
  const skills = data.skills || getSkillSet(role).slice(0, 4).join(", ");
  $("#coverOutput").textContent = `Dear Hiring Manager,\n\nI am excited to apply for ${role} at ${company}. As a student candidate, I bring a strong foundation in ${skills} and hands-on learning through projects, coursework, and continuous practice.\n\nI would welcome the opportunity to contribute with curiosity, discipline, and a willingness to learn quickly. Thank you for considering my application.\n\nSincerely,\n${data.personal.fullName || "Your Name"}`;
}

function renderChecklist() {
  const items = ["Contact details added", "Career objective is role-specific", "Skills match the role", "Projects include tools and impact", "Education is current", "PDF reviewed before applying"];
  $("#checklist").innerHTML = items.map((item, index) => `
    <label><input type="checkbox" ${index < 2 ? "checked" : ""} /> ${item}</label>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

init();