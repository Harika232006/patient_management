const $ = (id) => document.getElementById(id);

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
    }

    return data;
}

function showMessage(id, message, type = "success") {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.className = "message " + type;
}

function patientData(form) {
    const data = Object.fromEntries(new FormData(form).entries());

    if (data.patient_id) data.patient_id = Number(data.patient_id);
    if (data.age !== undefined) data.age = Number(data.age);

    return data;
}

function fillAgeDropdown(selectId, selectedValue = "") {
    const select = $(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Select age</option>';

    for (let age = 0; age <= 120; age++) {
        const option = document.createElement("option");
        option.value = age;
        option.textContent = age + " years";
        select.appendChild(option);
    }

    if (selectedValue !== "") select.value = String(selectedValue);
}

async function loadPatientOptions(selectId) {
    const select = $(selectId);
    if (!select) return;

    try {
        const patients = await api("/patients");
        select.innerHTML = '<option value="">Select patient ID</option>';

        patients.forEach(patient => {
            const option = document.createElement("option");
            option.value = patient.patient_id;
            option.textContent =
                `${patient.patient_id} — ${patient.name}`;
            select.appendChild(option);
        });
    } catch (error) {
        showMessage("message", error.message, "error");
    }
}

function displayPatientDetails(patient) {
    const target = $("patientDetails");
    if (!target) return;

    target.replaceChildren();

    const fields = [
        ["Patient ID", patient.patient_id],
        ["Full Name", patient.name],
        ["Email", patient.email || "Not provided"],
        ["Phone", patient.phone || "Not provided"],
        ["Gender", patient.gender],
        ["Age", patient.age + " years"],
        ["Problem", patient.problem]
    ];

    fields.forEach(([label, value]) => {
        const item = document.createElement("div");
        item.className = "detail-item";

        const small = document.createElement("small");
        small.textContent = label;

        const strong = document.createElement("strong");
        strong.textContent = value ?? "";

        item.append(small, strong);
        target.appendChild(item);
    });
}

// INSERT PATIENT
const insertForm = $("insertForm");

if (insertForm) {
    fillAgeDropdown("age");

    insertForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        try {
            await api("/patients", {
                method: "POST",
                body: JSON.stringify(patientData(insertForm))
            });

            showMessage("message", "Patient registered successfully!");
            insertForm.reset();
            fillAgeDropdown("age");
        } catch (error) {
            showMessage("message", error.message, "error");
        }
    });

    insertForm.addEventListener("reset", () => {
        setTimeout(() => fillAgeDropdown("age"), 0);
    });
}

// LIST ALL PATIENTS
async function loadPatients() {
    const rows = $("patientRows");
    if (!rows) return;

    try {
        const patients = await api("/patients");
        rows.replaceChildren();

        if (patients.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 7;
            td.textContent = "No patient records found.";
            tr.appendChild(td);
            rows.appendChild(tr);
        }

        patients.forEach(patient => {
            const tr = document.createElement("tr");

            [
                patient.patient_id,
                patient.name,
                patient.email || "—",
                patient.phone || "—",
                patient.gender,
                patient.age,
                patient.problem
            ].forEach((value, index) => {
                const td = document.createElement("td");
                td.textContent = value ?? "";

                if (index === 6) {
                    const badge = document.createElement("span");
                    badge.className = "status-badge";
                    badge.textContent = value ?? "";
                    td.textContent = "";
                    td.appendChild(badge);
                }

                tr.appendChild(td);
            });

            rows.appendChild(tr);
        });

        const count = $("totalPatients");
        if (count) count.textContent = patients.length;

        const search = $("searchPatient");
        if (search) filterPatients();
    } catch (error) {
        showMessage("listMessage", error.message, "error");
    }
}

function filterPatients() {
    const search = $("searchPatient");
    const rows = $("patientRows");
    if (!search || !rows) return;

    const term = search.value.toLowerCase().trim();

    Array.from(rows.querySelectorAll("tr")).forEach(row => {
        row.hidden = !row.textContent.toLowerCase().includes(term);
    });
}

if ($("searchPatient")) {
    $("searchPatient").addEventListener("input", filterPatients);
}

// VIEW ONE PATIENT
if ($("onePatientId")) {
    loadPatientOptions("onePatientId");

    $("onePatientId").addEventListener("change", async (event) => {
        const id = event.target.value;
        $("patientDetails").replaceChildren();

        if (!id) return;

        try {
            const patient = await api("/patients/" + encodeURIComponent(id));
            displayPatientDetails(patient);
            showMessage("message", "Patient record loaded successfully!");
        } catch (error) {
            showMessage("message", error.message, "error");
        }
    });
}

// UPDATE PATIENT
if ($("updatePatientId")) {
    fillAgeDropdown("age");
    loadPatientOptions("updatePatientId");

    $("updatePatientId").addEventListener("change", async (event) => {
        const id = event.target.value;
        const form = $("updateForm");

        form.reset();
        fillAgeDropdown("age");

        if (!id) return;

        try {
            const patient = await api("/patients/" + encodeURIComponent(id));

            form.elements.name.value = patient.name;
            form.elements.email.value = patient.email || "";
            form.elements.phone.value = patient.phone || "";
            form.elements.gender.value = patient.gender;
            fillAgeDropdown("age", patient.age);
            form.elements.problem.value = patient.problem;

            showMessage("message", "Patient details loaded. Edit and save.");
        } catch (error) {
            showMessage("message", error.message, "error");
        }
    });

    $("updateForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = $("updatePatientId").value;

        if (!id) {
            return showMessage("message", "Select a patient first.", "error");
        }

        try {
            await api("/patients/" + encodeURIComponent(id), {
                method: "PUT",
                body: JSON.stringify(patientData(event.target))
            });

            showMessage("message", "Patient updated successfully!");
            await loadPatientOptions("updatePatientId");
            $("updatePatientId").value = id;
        } catch (error) {
            showMessage("message", error.message, "error");
        }
    });
}

// DELETE PATIENT
if ($("deletePatientId")) {
    loadPatientOptions("deletePatientId");

    $("deleteForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = $("deletePatientId").value;

        if (!id) {
            return showMessage("message", "Select a patient first.", "error");
        }

        if (!confirm("Are you sure you want to delete this patient record?")) {
            return;
        }

        try {
            const result = await api("/patients/" + encodeURIComponent(id), {
                method: "DELETE"
            });

            showMessage("message", result.message);
            await loadPatientOptions("deletePatientId");
            $("deletePatientId").value = "";
        } catch (error) {
            showMessage("message", error.message, "error");
        }
    });
}

if ($("patientRows")) loadPatients();