import { useState } from "react";
import "./App.css";

import RegressionTable from "./RegressionTable";
import HausmanComparison from "./HausmanComparison";
import ModelSummary from "./ModelSummary";

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

  const [progressMessages, setProgressMessages] = useState([]);

  // ============================================================
  // FILE INSPECTION → AUTO-DETECT VARIABLES
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
  // SSE PROGRESS STREAM
  // ============================================================
  function startRealtimeProgress(execId) {
    const url = `${BACKEND_URL}/realtime/${execId}`;
    console.log("Connecting to SSE:", url);

    const evtSource = new EventSource(url);

    evtSource.onmessage = (event) => {
      const msg = event.data.trim();
      if (msg) {
        setProgressMessages((prev) => [...prev, msg]);
      }
    };

    evtSource.onerror = (err) => {
      console.error("SSE Error:", err);
      evtSource.close();
    };

    return evtSource;
  }

  // ============================================================
  // RUN ANALYSIS
  // ============================================================
  async function runAnalysis() {
    if (!file) return alert("Upload a dataset first.");

    setProgressMessages([]);
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
        setStatus("error");
        return;
      }

      setExecId(json.execution_id);

      const sse = startRealtimeProgress(json.execution_id);
      window._econo_sse = sse;

      // Poll results
      const check = setInterval(async () => {
        const poll = await fetch(`${BACKEND_URL}/api/results/${json.execution_id}`);
        const data = await poll.json();

        if (data.status === "running") return;

        if (data.status === "done" || data.status === "success") {
          clearInterval(check);
          window._econo_sse?.close();
          setOutput(data.result.output);
          setStatus("done");
          setLoading(false);
          return;
        }

        if (data.status === "error") {
          clearInterval(check);
          window._econo_sse?.close();
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
      window._econo_sse?.close();
    }
  }

  // ============================================================
  // UI
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

      {/* Inputs */}
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

      {/* Run */}
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

      {/* Live Progress */}
      {status === "running" && (
        <div className="card">
          <h2>Live Progress</h2>
          <div className="progress-box">
            {progressMessages.map((msg, i) => (
              <div key={i}>• {msg}</div>
            ))}
          </div>
        </div>
      )}

      {/* Final Results */}
      {status === "done" && output && (
        <div className="card">
          <h2>Results</h2>

          {/* ⭐ NEW — Combined Summary Table */}
          {output.results && <ModelSummary results={output.results} />}

          {/* Individual Models */}
          {output.results?.ols && (
            <RegressionTable title="Ordinary Least Squares" model={output.results.ols} />
          )}

          {output.results?.fe && (
            <RegressionTable title="Fixed Effects" model={output.results.fe} />
          )}

          {output.results?.re && (
            <RegressionTable title="Random Effects" model={output.results.re} />
          )}

          {output.results?.hausman && (
            <HausmanComparison
              fe={output.results.fe}
              re={output.results.re}
              haus={output.results.hausman}
            />
          )}

          {output.results?.ab && (
            <RegressionTable title="Arellano–Bond GMM" model={output.results.ab} />
          )}
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="card">
          <h2>Error</h2>
          {output && <pre>{JSON.stringify(output, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
