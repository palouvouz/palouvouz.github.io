// Admin panel. Η πραγματική προστασία είναι οι Firestore Security Rules:
// ακόμα και αν κάποιος παρακάμψει αυτόν τον κώδικα, ο server θα απορρίψει
// κάθε εγγραφή που δεν προέρχεται από διαχειριστή (έγγραφο admins/{uid}).
import { app, isConfigured } from "../firebase-config.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    deleteField
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const CATEGORIES = ["Android App", "Web App", "Gadget", "Hardware", "Experiment"];
const STATUSES = ["In Development", "Beta", "Released"];
const OPTIONAL_FIELDS = ["status", "demoUrl", "imageUrl", "version", "order"];
const DEFAULT_ORDER = 100;
const URL_MAX_LENGTH = 500;
const VIEWS = ["view-loading", "view-login", "view-denied", "view-bar", "view-form", "view-list"];

const $ = (id) => document.getElementById(id);

let auth = null;
let db = null;
let projects = [];
let editingId = null;
let pendingDelete = null;

/* ---------- Βοηθητικά UI ---------- */

function showViews(...visible) {
    for (const id of VIEWS) $(id).hidden = !visible.includes(id);
}

function setMsg(id, text, isError = false) {
    const node = $(id);
    node.textContent = text;
    node.classList.toggle("error", isError);
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function fillSelect(select, values, placeholder) {
    select.textContent = "";
    const empty = el("option", "", placeholder);
    empty.value = "";
    select.appendChild(empty);
    for (const value of values) {
        const option = el("option", "", value);
        option.value = value;
        select.appendChild(option);
    }
}

// "" = κενό, null = άκυρο, αλλιώς το κανονικοποιημένο https URL.
function cleanUrl(value) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.length > URL_MAX_LENGTH) return null;
    try {
        const url = new URL(trimmed);
        return url.protocol === "https:" ? url.href : null;
    } catch {
        return null;
    }
}

function authErrorText(error) {
    switch (error?.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-email":
            return "Λάθος email ή κωδικός.";
        case "auth/too-many-requests":
            return "Πάρα πολλές προσπάθειες. Δοκίμασε ξανά αργότερα.";
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
            return "Η σύνδεση ακυρώθηκε.";
        case "auth/popup-blocked":
            return "Ο browser μπλόκαρε το παράθυρο σύνδεσης. Επίτρεψέ το και ξαναδοκίμασε.";
        case "auth/operation-not-allowed":
            return "Αυτή η μέθοδος σύνδεσης δεν είναι ενεργοποιημένη στο Firebase Authentication.";
        case "auth/unauthorized-domain":
            return "Το domain δεν είναι στα Authorized domains του Firebase Authentication.";
        case "auth/network-request-failed":
            return "Πρόβλημα δικτύου. Έλεγξε τη σύνδεσή σου.";
        default:
            return "Η σύνδεση απέτυχε.";
    }
}

function firestoreErrorText(error) {
    if (error?.code === "permission-denied") {
        return "Η ενέργεια απορρίφθηκε από τους Security Rules (δικαιώματα ή μη έγκυρα δεδομένα).";
    }
    return "Η ενέργεια απέτυχε" + (error?.code ? " (" + error.code + ")" : "") + ".";
}

/* ---------- Έλεγχος διαχειριστή ---------- */

// true = διαχειριστής, false = όχι, null = δεν μπόρεσε να ελεγχθεί (σφάλμα)
async function checkAdmin(user) {
    try {
        const snapshot = await getDoc(doc(db, "admins", user.uid));
        return snapshot.exists();
    } catch (error) {
        console.error("Αποτυχία ελέγχου διαχειριστή:", error);
        return null;
    }
}

async function handleAuthState(user) {
    if (!user) {
        projects = [];
        editingId = null;
        $("login-password").value = "";
        $("project-list").textContent = "";
        showViews("view-login");
        return;
    }

    showViews("view-loading");
    const isAdmin = await checkAdmin(user);
    if (!auth.currentUser || auth.currentUser.uid !== user.uid) return;

    if (isAdmin === true) {
        $("bar-email").textContent = user.email ?? user.uid;
        showViews("view-bar", "view-list");
        await loadProjects();
        return;
    }

    $("denied-email").textContent = user.email ?? "(χωρίς email)";
    $("denied-uid").textContent = user.uid;
    setMsg(
        "denied-note",
        isAdmin === null
            ? "Δεν ήταν δυνατός ο έλεγχος (σφάλμα δικτύου ή Rules). Ανανέωσε τη σελίδα."
            : "",
        isAdmin === null
    );
    showViews("view-denied");
}

/* ---------- Σύνδεση / αποσύνδεση ---------- */

async function handleLogin(event) {
    event.preventDefault();
    const email = $("login-email").value.trim();
    const password = $("login-password").value;
    if (!email || !password) {
        setMsg("login-msg", "Συμπλήρωσε email και κωδικό.", true);
        return;
    }

    $("login-submit").disabled = true;
    setMsg("login-msg", "");
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        setMsg("login-msg", authErrorText(error), true);
    } finally {
        $("login-submit").disabled = false;
    }
}

async function handleGoogleLogin() {
    $("google-btn").disabled = true;
    setMsg("login-msg", "");
    try {
        await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
        setMsg("login-msg", authErrorText(error), true);
    } finally {
        $("google-btn").disabled = false;
    }
}

/* ---------- Λίστα projects ---------- */

function sortProjects(list) {
    return list.sort((a, b) => {
        const byOrder = (a.order ?? DEFAULT_ORDER) - (b.order ?? DEFAULT_ORDER);
        if (byOrder !== 0) return byOrder;
        return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
    });
}

async function loadProjects() {
    $("list-status").textContent = "Φόρτωση…";
    try {
        const snapshot = await getDocs(collection(db, "projects"));
        projects = sortProjects(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        renderList();
    } catch (error) {
        console.error("Αποτυχία φόρτωσης projects:", error);
        $("list-status").textContent = firestoreErrorText(error);
    }
}

function renderList() {
    const list = $("project-list");
    list.textContent = "";
    $("list-status").textContent = projects.length
        ? "Σύνολο: " + projects.length
        : "Δεν υπάρχουν projects ακόμα. Πάτα «Νέο project».";
    for (const project of projects) list.appendChild(buildRow(project));
}

function buildRow(project) {
    const row = el("div", "row");

    const main = el("div", "row-main");
    main.appendChild(el("div", "row-title", project.title ?? "(χωρίς όνομα)"));
    const meta = el("div", "row-meta");
    const details = [project.category, project.status, project.version].filter(Boolean).join(" · ");
    if (details) meta.appendChild(el("span", "", details));
    meta.appendChild(
        project.published === true
            ? el("span", "tag", "Δημοσιευμένο")
            : el("span", "tag tag-muted", "Πρόχειρο")
    );
    main.appendChild(meta);
    row.appendChild(main);

    const actions = el("div", "row-actions");
    actions.appendChild(button("Επεξεργασία", "btn btn-small", () => openForm(project)));
    actions.appendChild(
        button(
            project.published === true ? "Απόκρυψη" : "Δημοσίευση",
            "btn btn-small",
            () => togglePublished(project)
        )
    );
    actions.appendChild(button("Διαγραφή", "btn btn-small btn-danger", () => askDelete(project)));
    row.appendChild(actions);

    return row;
}

function button(text, className, onClick) {
    const node = el("button", className, text);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
}

async function togglePublished(project) {
    try {
        await updateDoc(doc(db, "projects", project.id), {
            published: project.published !== true,
            updatedAt: serverTimestamp()
        });
        await loadProjects();
    } catch (error) {
        console.error("Αποτυχία αλλαγής δημοσίευσης:", error);
        $("list-status").textContent = firestoreErrorText(error);
    }
}

/* ---------- Φόρμα ---------- */

function openForm(project) {
    editingId = project ? project.id : null;
    $("form-title").textContent = project ? "Επεξεργασία project" : "Νέο project";
    $("f-title").value = project?.title ?? "";
    $("f-description").value = project?.description ?? "";
    $("f-category").value = project?.category ?? "";
    $("f-status").value = project?.status ?? "";
    $("f-github").value = project?.githubUrl ?? "";
    $("f-demo").value = project?.demoUrl ?? "";
    $("f-image").value = project?.imageUrl ?? "";
    $("f-version").value = project?.version ?? "";
    $("f-order").value = project?.order ?? "";
    $("f-published").checked = project?.published === true;
    setMsg("form-msg", "");
    showViews("view-bar", "view-form", "view-list");
    $("view-form").scrollIntoView({ behavior: "smooth", block: "start" });
    $("f-title").focus({ preventScroll: true });
}

function closeForm() {
    editingId = null;
    showViews("view-bar", "view-list");
}

function readForm() {
    const title = $("f-title").value.trim();
    const description = $("f-description").value.trim();
    const category = $("f-category").value;
    const status = $("f-status").value;
    const githubUrl = cleanUrl($("f-github").value);
    const demoUrl = cleanUrl($("f-demo").value);
    const imageUrl = cleanUrl($("f-image").value);
    const version = $("f-version").value.trim();
    const orderText = $("f-order").value.trim();

    if (!title || title.length > 80) {
        return { error: "Το όνομα είναι υποχρεωτικό (έως 80 χαρακτήρες)." };
    }
    if (!description || description.length > 400) {
        return { error: "Η περιγραφή είναι υποχρεωτική (έως 400 χαρακτήρες)." };
    }
    if (!CATEGORIES.includes(category)) {
        return { error: "Διάλεξε κατηγορία." };
    }
    if (status && !STATUSES.includes(status)) {
        return { error: "Μη έγκυρη κατάσταση ανάπτυξης." };
    }
    if (!githubUrl) {
        return { error: "Το GitHub URL είναι υποχρεωτικό και πρέπει να ξεκινά με https://" };
    }
    if (demoUrl === null) {
        return { error: "Το Demo URL πρέπει να ξεκινά με https://" };
    }
    if (imageUrl === null) {
        return { error: "Το URL εικόνας πρέπει να ξεκινά με https://" };
    }
    if (version.length > 20) {
        return { error: "Η έκδοση μπορεί να έχει έως 20 χαρακτήρες." };
    }

    let order = "";
    if (orderText !== "") {
        order = Number(orderText);
        if (!Number.isFinite(order)) {
            return { error: "Η σειρά εμφάνισης πρέπει να είναι αριθμός." };
        }
    }

    return {
        values: {
            title,
            description,
            category,
            githubUrl,
            published: $("f-published").checked,
            status,
            demoUrl,
            imageUrl,
            version,
            order
        }
    };
}

function buildPayload(values, isEdit) {
    const payload = {
        title: values.title,
        description: values.description,
        category: values.category,
        githubUrl: values.githubUrl,
        published: values.published,
        updatedAt: serverTimestamp()
    };

    for (const key of OPTIONAL_FIELDS) {
        const value = values[key];
        if (value !== "") {
            payload[key] = value;
        } else if (isEdit) {
            // Κενό πεδίο σε επεξεργασία = αφαίρεση του πεδίου από το έγγραφο.
            payload[key] = deleteField();
        }
    }

    if (!isEdit) payload.createdAt = serverTimestamp();
    return payload;
}

async function handleSave(event) {
    event.preventDefault();
    const result = readForm();
    if (result.error) {
        setMsg("form-msg", result.error, true);
        return;
    }

    const isEdit = editingId !== null;
    $("save-btn").disabled = true;
    setMsg("form-msg", "Αποθήκευση…");
    try {
        const payload = buildPayload(result.values, isEdit);
        if (isEdit) {
            await updateDoc(doc(db, "projects", editingId), payload);
        } else {
            await addDoc(collection(db, "projects"), payload);
        }
        closeForm();
        await loadProjects();
    } catch (error) {
        console.error("Αποτυχία αποθήκευσης:", error);
        setMsg("form-msg", firestoreErrorText(error), true);
    } finally {
        $("save-btn").disabled = false;
    }
}

/* ---------- Διαγραφή με επιβεβαίωση ---------- */

function askDelete(project) {
    pendingDelete = project;
    $("delete-text").textContent =
        "Το project «" + (project.title ?? "") + "» θα διαγραφεί οριστικά. Η ενέργεια δεν αναιρείται.";
    $("delete-confirm").disabled = false;
    $("delete-dialog").showModal();
}

async function confirmDelete() {
    const project = pendingDelete;
    if (!project) return;

    $("delete-confirm").disabled = true;
    try {
        await deleteDoc(doc(db, "projects", project.id));
        $("delete-dialog").close();
        if (editingId === project.id) closeForm();
        await loadProjects();
    } catch (error) {
        console.error("Αποτυχία διαγραφής:", error);
        $("delete-text").textContent = firestoreErrorText(error);
        $("delete-confirm").disabled = false;
    }
}

/* ---------- Εκκίνηση ---------- */

function start() {
    if (!isConfigured) {
        $("loading-title").textContent =
            "Το Firebase δεν έχει ρυθμιστεί ακόμα (αρχείο vibecoded/firebase-config.js).";
        return;
    }

    auth = getAuth(app);
    db = getFirestore(app);

    fillSelect($("f-category"), CATEGORIES, "Διάλεξε…");
    fillSelect($("f-status"), STATUSES, "— καμία —");

    $("login-form").addEventListener("submit", handleLogin);
    $("google-btn").addEventListener("click", handleGoogleLogin);
    for (const node of document.querySelectorAll(".js-signout")) {
        node.addEventListener("click", () => signOut(auth));
    }
    $("new-btn").addEventListener("click", () => openForm(null));
    $("cancel-btn").addEventListener("click", closeForm);
    $("project-form").addEventListener("submit", handleSave);
    $("delete-confirm").addEventListener("click", confirmDelete);
    $("delete-cancel").addEventListener("click", () => $("delete-dialog").close());
    $("delete-dialog").addEventListener("close", () => {
        pendingDelete = null;
    });

    onAuthStateChanged(auth, handleAuthState);
}

start();
