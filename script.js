// =============================
const BACKEND_URL = "https://backend-production-7fc0.up.railway.app";

function api(path) {
    if (!path.startsWith("/")) path = "/" + path;
    return BACKEND_URL + path;
}

// =============================
// CONFIG — BACKEND URL
// =============================
const BACKEND_URL = "https://backend-production-7fc0.up.railway.app";

function api(path) {
    if (!path.startsWith("/")) path = "/" + path;
    return BACKEND_URL + path;
}

// =============================

// MUST NOT end with a slash — prevents //api/... bugs
const API = import.meta.env.VITE_API_URL;

// Build safe backend paths
function api(path) {
    // ensures only ONE slash between base + path
    if (!path.startsWith("/")) path = "/" + path;
    return BACKEND_URL + path;
}

let inspectedData = null;
let uploadedFile = null;

// -----------------------------
// STEP 1 — INSPECT DATASET
// -----------------------------
async function inspectDataset() {
    const fileInput = document.getElementById("csvFile");
    uploadedFile = fileInput.files[0];

    if (!uploadedFile) {
        alert("Upload a CSV first.");
        return;
    }

    const formData = new FormData();
    formData.append("file", uploadedFile);

    let res;
    try {
        res = await fetch(api("api/inspect"), {
            method: "POST",
            body: formData,
        });
    } catch (err) {
        alert("Network error (frontend → backend unreachable):\n" + err);
        return;
    }

    if (!res.ok) {
        const text = await res.text();
        alert("Inspect failed:\n" + text);
        return;
    }

    const data = await res.json();
    inspectedData = data;

    document.getElementById("inspectStatus").innerHTML = `
        <b>Dataset Loaded</b><br>
        Columns: ${data.columns.join(", ")}<br>
        Auto DV: <b>${data.auto_dependent_variable}</b>
    `;

    populateOptions(data);
    document.getElementById("optionsCard").style.display = "block";
}


// -----------------------------
// POPULATE DV + PREDICTORS UI
// -----------------------------
function populateOptions(meta) {
    const dvSelect = document.getElementById("dvSelect");
    dvSelect.innerHTML = "";

    meta.columns.forEach(col => {
        const opt = document.createElement("option");
        opt.value = col;
        opt.textContent = col;
        if (col === meta.auto_dependent_variable) opt.selected = true;
        dvSelect.appendChild(opt);
    });

    const box = document.getElementById("predictorBox");
    box.innerHTML = "";

    meta.columns.forEach(col => {
        const lbl = document.createElement("label");
        lbl.style.display = "block";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.value = col;

        if (meta.suggested_predictors.includes(col)) chk.checked = true;

        lbl.appendChild(chk);
        lbl.append(" " + col);
        box.appendChild(lbl);
    });
}


// -----------------------------
// STEP 2 — RUN ANALYSIS
// -----------------------------
async function runAnalysis() {
    const dv = document.getElementById("dvSelect").value;

    const predictorChecks = Array.from(
        document.querySelectorAll("#predictorBox input[type=checkbox]")
    );
    const predictors = predictorChecks
        .filter(c => c.checked)
        .map(c => c.value)
        .filter(p => p !== dv); // prevent DV being predictor

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("research_question", document.getElementById("researchQuestion").value);
    formData.append("report_type", document.getElementById("reportType").value);
    formData.append("dv_override", dv);
    formData.append("predictor_override", predictors.join(","));

    let res;
    try {
        res = await fetch(api("api/analyze"), {
            method: "POST",
            body: formData,
        });
    } catch (err) {
        alert("Network error (frontend cannot reach backend):\n" + err);
        return;
    }

    if (!res.ok) {
        const text = await res.text();
        alert("Analysis failed:\n" + text);
        return;
    }

    const data = await res.json();

    document.getElementById("resultsCard").style.display = "block";
    document.getElementById("regressionOutput").textContent = data.regression_table;

    const plotsDiv = document.getElementById("plots");
    plotsDiv.innerHTML = "";

    data.plots.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.classList.add("plot-img");
        plotsDiv.appendChild(img);
    });

    document.getElementById("reportLink").href = data.report_file;
}
