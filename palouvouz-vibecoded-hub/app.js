// Δημόσια σελίδα: διαβάζει από το Firestore ΜΟΝΟ τα δημοσιευμένα projects.
import { app, isConfigured } from "./firebase-config.js";
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const DEFAULT_ORDER = 100;
const ALL_LABEL = "Όλα";

const stateLoading = document.getElementById("state-loading");
const stateEmpty = document.getElementById("state-empty");
const stateError = document.getElementById("state-error");
const errorDetail = document.getElementById("error-detail");
const retryButton = document.getElementById("retry-btn");
const filtersEl = document.getElementById("filters");
const gridEl = document.getElementById("project-grid");

let projects = [];
let activeCategory = ALL_LABEL;

function showOnly(name) {
    stateLoading.hidden = name !== "loading";
    stateEmpty.hidden = name !== "empty";
    stateError.hidden = name !== "error";
    gridEl.hidden = name !== "grid";
    filtersEl.hidden = name !== "grid" || filtersEl.childElementCount === 0;
}

function fail(message) {
    errorDetail.textContent = message;
    showOnly("error");
}

// Δέχεται μόνο https URLs. Κάθε άλλη τιμή (π.χ. javascript:) απορρίπτεται.
function httpsUrl(value) {
    if (typeof value !== "string") return null;
    try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.href : null;
    } catch {
        return null;
    }
}

// Όλα τα κείμενα μπαίνουν με textContent (όχι innerHTML), για προστασία από XSS.
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function link(text, href, className) {
    const anchor = el("a", className, text);
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    return anchor;
}

function isValidProject(project) {
    return (
        typeof project.title === "string" &&
        typeof project.description === "string" &&
        typeof project.category === "string" &&
        typeof project.githubUrl === "string"
    );
}

function sortProjects(list) {
    return list.sort((a, b) => {
        const byOrder = (a.order ?? DEFAULT_ORDER) - (b.order ?? DEFAULT_ORDER);
        if (byOrder !== 0) return byOrder;
        return b.createdMs - a.createdMs;
    });
}

function buildThumb(project) {
    const thumb = el("div", "project-thumb");

    const showMonogram = () => {
        thumb.textContent = "";
        const letter = Array.from(project.title.trim())[0] ?? "?";
        thumb.appendChild(el("span", "monogram", letter.toUpperCase()));
    };

    const imageUrl = httpsUrl(project.imageUrl);
    if (!imageUrl) {
        showMonogram();
        return thumb;
    }

    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", showMonogram);
    img.src = imageUrl;
    thumb.appendChild(img);
    return thumb;
}

function buildCard(project) {
    const card = el("article", "card project-card");
    card.appendChild(buildThumb(project));

    const body = el("div", "project-body");
    const tags = el("div", "project-tags");
    tags.appendChild(el("span", "tag", project.category));
    if (project.status) tags.appendChild(el("span", "tag tag-muted", project.status));
    if (project.version) tags.appendChild(el("span", "tag tag-muted", project.version));
    body.appendChild(tags);
    body.appendChild(el("h3", "card-title", project.title));
    body.appendChild(el("p", "project-desc", project.description));
    card.appendChild(body);

    const actions = el("div", "project-actions");
    const githubUrl = httpsUrl(project.githubUrl);
    if (githubUrl) actions.appendChild(link("GitHub", githubUrl, "btn btn-primary"));
    const demoUrl = httpsUrl(project.demoUrl);
    if (demoUrl) actions.appendChild(link("Demo", demoUrl, "btn"));
    card.appendChild(actions);

    return card;
}

function renderGrid() {
    gridEl.textContent = "";
    const visible =
        activeCategory === ALL_LABEL
            ? projects
            : projects.filter((project) => project.category === activeCategory);
    for (const project of visible) gridEl.appendChild(buildCard(project));
}

function renderFilters() {
    filtersEl.textContent = "";
    const categories = [...new Set(projects.map((project) => project.category))];

    // Με μία μόνο κατηγορία το φίλτρο δεν προσφέρει τίποτα.
    if (categories.length < 2) {
        activeCategory = ALL_LABEL;
        return;
    }
    if (activeCategory !== ALL_LABEL && !categories.includes(activeCategory)) {
        activeCategory = ALL_LABEL;
    }

    for (const label of [ALL_LABEL, ...categories]) {
        const chip = el("button", "chip", label);
        chip.type = "button";
        chip.setAttribute("aria-pressed", String(label === activeCategory));
        chip.addEventListener("click", () => {
            activeCategory = label;
            for (const other of filtersEl.children) {
                other.setAttribute("aria-pressed", String(other === chip));
            }
            renderGrid();
        });
        filtersEl.appendChild(chip);
    }
}

async function loadProjects() {
    showOnly("loading");

    if (!isConfigured) {
        fail("Το Firebase δεν έχει ρυθμιστεί ακόμα (αρχείο firebase-config.js).");
        return;
    }

    try {
        const db = getFirestore(app);
        // Το where("published", "==", true) είναι ΑΠΑΡΑΙΤΗΤΟ: οι Security Rules
        // επιτρέπουν ανάγνωση μόνο αν το query αποδεδειγμένα επιστρέφει δημοσιευμένα.
        const snapshot = await getDocs(
            query(collection(db, "projects"), where("published", "==", true))
        );

        projects = sortProjects(
            snapshot.docs
                .map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    createdMs: doc.data().createdAt?.toMillis?.() ?? 0
                }))
                .filter(isValidProject)
        );

        if (projects.length === 0) {
            showOnly("empty");
            return;
        }

        renderFilters();
        renderGrid();
        showOnly("grid");
    } catch (error) {
        console.error("Αποτυχία ανάγνωσης projects:", error);
        fail(
            error.code === "permission-denied"
                ? "Η ανάγνωση απορρίφθηκε από τους Security Rules."
                : "Πρόβλημα σύνδεσης με τη βάση δεδομένων. Δοκίμασε ξανά σε λίγο."
        );
    }
}

retryButton.addEventListener("click", loadProjects);
loadProjects();
