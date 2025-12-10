import React from "react";
import "./RegressionTable.css";

export default function RegressionTable({ title, model }) {
  if (!model || !model.results) return null;

  const rows = model.results.map((row) => ({
    variable: row.feature || row.variable || row.name || "var",
    coef: row.estimate ?? row.coef ?? row.value,
    se: row.std_error ?? row.se,
    t: row.t_stat ?? (row.estimate && row.std_error ? row.estimate / row.std_error : null),
    p: row.p_value ?? row.p,
  }));

  function stars(p) {
    if (p == null) return "";
    if (p < 0.001) return "***";
    if (p < 0.01) return "**";
    if (p < 0.05) return "*";
    if (p < 0.1) return ".";
    return "";
  }

  return (
    <div className="reg-card">
      <h2 className="reg-title">{title}</h2>

      <table className="reg-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Coef</th>
            <th>Std.Err</th>
            <th>t-Stat</th>
            <th>P-value</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.variable}</td>
              <td>{r.coef?.toFixed?.(4)} {stars(r.p)}</td>
              <td>{r.se?.toFixed?.(4)}</td>
              <td>{r.t?.toFixed?.(3)}</td>
              <td>{r.p?.toFixed?.(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
