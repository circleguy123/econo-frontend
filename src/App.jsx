import { useState } from "react";
import "./App.css";

const BACKEND_URL = "https://backend-production-7fc0.up.railway.app";
// Example: "https://backend-production-7fc0.up.railway.app"

export default function App() {
  const [file, setFile] = useState(null);
  const [method, setMethod] = useState("panel_hausman");
  const [y, setY] = useState("");
  const [X, setX] = useState("");
  const [panelId, setPanelId] = useState("");
  const [panelTime, setPanelTime] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [execId, setExecId] = useState(null);

  async function runAnalysis() {
    if (!file) return alert("Upload a dataset first.");

    setStatus("running");
    setLoading(true);
    setOutput(null);

    const form = new FormData();
    form.append("file", file);
    form.append("method", method);
    form.append("y", y);
    form.append("X", X);
    form.append("panel_id", panelId);
    form.append("panel_time", panelTime);

    try {
      // submit real job
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

      // start polling worker results
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

  return (
    <div className="app">
      <h1>ECONO ENGINE</h1>

      {/* Upload */}
      <div className="card">
        <h2>Upload Dataset</h2>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
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

        {(method.includes("panel") || method === "panel_ab") && (
          <>
            <input
              placeholder="Panel ID column"
              value={panelId}
              onChange={(e) => setPanelId(e.target.value)}
            />
            <input
              placeholder="Time column"
              value={panelTime}
              onChange={(e) => setPanelTime(e.target.value)}
            />
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
