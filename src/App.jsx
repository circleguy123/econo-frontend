import { useState } from "react";
import "./App.css";

console.log("DEBUG: Backend URL =", import.meta.env.VITE_API_URL);
const BACKEND_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [file, setFile] = useState(null);
  const [method, setMethod] = useState("panel_hausman");
  const [y, setY] = useState("");
  const [X, setX] = useState("");
  const [panelId, setPanelId] = useState("");
  const [panelTime, setPanelTime] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle");
  const [execId, setExecId] = useState(null);

  const [autoIdCandidates, setAutoIdCandidates] = useState([]);
  const [autoTimeCandidates, setAutoTimeCandidates] = useState([]);

  // ============================================================
  // FILE INSPECTION → AUTO-DETECT DV, X, PANEL ID, TIME
  // ============================================================
  async function inspectFile(f) {
    if (!f) return;

    const form = new FormData();
    form.append("file", f);

    try {
      const res = await fetch(`${BACKEND_URL}/api/inspect`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      console.log("INSPECT:", data);

      setY(data.auto_dependent_variable || "");

      if (data.suggested_predictors?.length > 0) {
        setX(data.suggested_predictors.join(","));
      }

      setAutoIdCandidates(data.auto_id_candidates || []);
      setAutoTimeCandidates(data.auto_time_candidates || []);

    } catch (err) {
      console.error("INSPECT ERROR:", err);
      alert("Could not inspect dataset.");
    }
  }

  // ============================================================
  // RUN ANALYSIS
  // ============================================================
  async function runAnalysis() {
    if (method.includes("panel") && (!panelId || !panelTime)) {
      alert("Please select Panel ID and Time columns.");
      return;
    }

    if (!file) return alert("Upload a dataset first.");

    setStatus("running");
    setLoading(true);
    setOutput(null);

    const form = new FormData();
    form.append("file", file);
    form.append("dv_override", y);
    form.append("predictor_override", X);
    form.append("research_question", "");
    form.append("report_type", "executive");

    form.append("method", method);
    form.append("panel_id", panelId);
    form.append("panel_time", panelTime);

    try {
      const res = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: "POST",
        body: form,
      });

      const json = await res.json();

      if (!json.execution_id) {
        alert("Backend did not return execution_id");
        console.error(json);
        setStatus("error");
        return;
      }

      setExecId(json.execution_id);

      // Poll results
      const check = setInterval(async () => {
        const poll = await fetch(`${BACKEND_URL}/api/results/${json.execution_id}`);
        const data = await poll.json();

        if (data.status === "done") {
          clearInterval(check);
          setOutput(data.result);
          setStatus("done");
          setLoading(false);
        }

        if (data.status === "error") {
          clearInterval(check);
          setOutput(data);
          setStatus("error");
          setLoading(false);
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      alert("Frontend cannot reach backend.");
      setStatus("error");
      setLoading(false);
    }
  }

  // ============================================================
  // UI RENDER
  // ============================================================
  return (
    <div className="app">
      <h1>ECONO ENGINE</h1>

      {/* Upload */}
      <div className="card">
        <h2>Upload Dataset</h2>
        <input
          type="file"
          onChange={(e) => {
            const f = e.target.files[0];
            setFile(f);
            inspectFile(f);
          }}
        />
      </div>

      {/* Model Selector */}
      <div className="card">
        <h2>Analysis Method</h2>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="panel_hausman">Hausman Test</option>
          <option value="panel_fe">Fixed Effects</option>
          <option value="panel_re">Random Effects</option>
          <option value="panel_ab">Arellano–Bond GMM</option>
          <option value="ols">OLS</option>
        </select>
      </div>

      {/* Model Inputs */}
      <div className="card">
        <h2>Model Inputs</h2>

        <input
          placeholder="Dependent variable (y)"
          value={y}
          onChange={(e) => setY(e.target.value)}
        />

        <input
          placeholder="Independent variables (X1,X2,X3)"
          value={X}
          onChange={(e) => setX(e.target.value)}
        />

        {method.includes("panel") && (
          <>
            <label>Panel ID Column</label>
            <select value={panelId} onChange={(e) => setPanelId(e.target.value)}>
              <option value="">Select panel ID</option>
              {autoIdCandidates.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <label>Time Column</label>
            <select value={panelTime} onChange={(e) => setPanelTime(e.target.value)}>
              <option value="">Select time column</option>
              {autoTimeCandidates.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Run Button */}
      <button onClick={runAnalysis} disabled={loading}>
        {loading ? "Running..." : "Run Analysis"}
      </button>

      {/* Worker Status */}
      {status === "running" && (
        <div className="card">
          <h2>Worker Status</h2>
          <p>Processing… please wait</p>
          {execId && <p>Execution ID: {execId}</p>}
        </div>
      )}

      {/* Results */}
      {status === "done" && output && (
        <div className="card">
          <h2>Results</h2>
          <pre>{JSON.stringify(output, null, 2)}</pre>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="card">
          <h2>Error</h2>
          <p>There was an error during analysis</p>
          {output && <pre>{JSON.stringify(output, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
