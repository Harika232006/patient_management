const express = require("express");
const mysql = require("mysql2");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "harika_care"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }
    console.log("MySQL Connected Successfully!");
});

// GET ALL PATIENTS
app.get("/patients", (req, res) => {
    const sql = "SELECT * FROM patient ORDER BY patient_id DESC";

    db.query(sql, (err, result) => {
        if (err) {
            console.error("FETCH ERROR:", err.sqlMessage || err.message);
            return res.status(500).json({
                error: err.sqlMessage || "Unable to fetch patients"
            });
        }
        res.json(result);
    });
});

// GET ONE PATIENT
app.get("/patients/:id", (req, res) => {
    const sql = "SELECT * FROM patient WHERE patient_id = ?";

    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error("FIND ERROR:", err.sqlMessage || err.message);
            return res.status(500).json({
                error: err.sqlMessage || "Unable to fetch patient"
            });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "Patient not found" });
        }

        res.json(result[0]);
    });
});

// INSERT PATIENT
app.post("/patients", (req, res) => {
    const { patient_id, name, email, phone, gender, age, problem } = req.body;

    if (
        !patient_id || !name?.trim() || !gender ||
        age === "" || age === undefined || !problem
    ) {
        return res.status(400).json({
            error: "Please fill all required fields"
        });
    }

    const id = Number(patient_id);
    const patientAge = Number(age);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: "Enter a valid patient ID"
        });
    }

    if (!Number.isInteger(patientAge) || patientAge < 0 || patientAge > 120) {
        return res.status(400).json({
            error: "Select a valid age"
        });
    }

    const sql = `
        INSERT INTO patient
        (patient_id, name, email, phone, gender, age, problem)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        id,
        name.trim(),
        email || "",
        phone || "",
        gender,
        patientAge,
        problem
    ], (err, result) => {
        if (err) {
            console.error("INSERT ERROR:", err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    error: "This patient ID already exists"
                });
            }

            return res.status(500).json({
                error: err.sqlMessage || err.message || "Unable to insert patient"
            });
        }

        res.status(201).json({
            message: "Patient registered successfully!",
            patient_id: id
        });
    });
});

// UPDATE PATIENT
app.put("/patients/:id", (req, res) => {
    const { name, email, phone, gender, age, problem } = req.body;

    if (
        !name?.trim() || !gender ||
        age === "" || age === undefined || !problem
    ) {
        return res.status(400).json({
            error: "Please fill all required fields"
        });
    }

    const patientAge = Number(age);

    if (!Number.isInteger(patientAge) || patientAge < 0 || patientAge > 120) {
        return res.status(400).json({
            error: "Select a valid age"
        });
    }

    const sql = `
        UPDATE patient
        SET name = ?, email = ?, phone = ?, gender = ?, age = ?, problem = ?
        WHERE patient_id = ?
    `;

    db.query(sql, [
        name.trim(),
        email || "",
        phone || "",
        gender,
        patientAge,
        problem,
        req.params.id
    ], (err, result) => {
        if (err) {
            console.error("UPDATE ERROR:", err.sqlMessage || err.message);
            return res.status(500).json({
                error: err.sqlMessage || "Unable to update patient"
            });
        }

        if (result.affectedRows === 0) {
            return db.query(
                "SELECT patient_id FROM patient WHERE patient_id = ?",
                [req.params.id],
                (checkErr, rows) => {
                    if (checkErr) {
                        console.error("CHECK ERROR:", checkErr.message);
                        return res.status(500).json({
                            error: "Database error"
                        });
                    }

                    if (rows.length === 0) {
                        return res.status(404).json({
                            error: "Patient not found"
                        });
                    }

                    res.json({
                        message: "Patient details are already up to date"
                    });
                }
            );
        }

        res.json({ message: "Patient updated successfully!" });
    });
});

// DELETE PATIENT
app.delete("/patients/:id", (req, res) => {
    const sql = "DELETE FROM patient WHERE patient_id = ?";

    db.query(sql, [req.params.id], (err, result) => {
        if (err) {
            console.error("DELETE ERROR:", err.sqlMessage || err.message);
            return res.status(500).json({
                error: err.sqlMessage || "Unable to delete patient"
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Patient not found"
            });
        }

        res.json({ message: "Patient deleted successfully!" });
    });
});

app.listen(PORT, () => {
    console.log(`Harika Care running at http://localhost:${PORT}`);
});