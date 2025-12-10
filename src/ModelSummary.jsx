import React from "react";
import "./RegressionTable.css";

// Safely extract coefficient or return null
function getCoef(model, variable) {
  if (!model || !model.results) return null;

  const row = model.results.find(
    (r) => r.feature === variable || r.variable === variable || r.name === variable
  );
  return row ? row.estimate ?? row.coef ?? row.value ?? null : null;
}

function stars(p) {
  if (p == null) return "";
  if (p < 0.001) return "***";
  if (p < 0.01) return "**";
  if (p < 0.05) return "*";
  if (p < 0.1) return ".";
  return "";
}

export default function ModelSummary({ results }) {
  if (!results) return null;

  const { ols, fe, re, ab } = results;

  // Collect all unique predictor names
  const vars = new Set();

  [ols, fe, re, ab].forEach((model) => {
    if (model?.results) {
      model.results.forEach((r) => {
        const name = r.feature || r.variable || r.name;
        if (name && name.toLowerCase() !== "intercept") vars.add(name);
      });
    }
  });

  const predictorList = Array.from(vars);

  return (
    <div className="reg-card">
      <h2 className="reg-title">Model Summary Table</h2>

      <table className="reg-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>OLS</th>
            <th>FE</th>
            <th>RE</th>
            <th>AB GMM</th>
          </tr>
        </thead>
        <tbody>
          {predictorList.map((v) => (
            <tr key={v}>
              <td>{v}</td>
              <td>{getCoef(ols, v)?.toFixed?.(4) ?? ""}</td>
              <td>{getCoef(fe, v)?.toFixed?.(4) ?? ""}</td>
              <td>{getCoef(re, v)?.toFixed?.(4) ?? ""}</td>
              <td>{getCoef(ab, v)?.toFixed?.(4) ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Hausman summary if available */}
      {results.hausman && (
        <div className="haus-summary">
          <p><b>Hausman Test:</b></p>
          <p>
            χ²({results.hausman.df}) = {results.hausman.statistic.toFixed(4)}
            &nbsp;&nbsp; p = {results.hausman.pvalue.toFixed(4)}
          </p>
          <p className="haus-conclusion">
            {results.hausman.interpretation}
          </p>
        </div>
      )}
    </div>
  );
}
