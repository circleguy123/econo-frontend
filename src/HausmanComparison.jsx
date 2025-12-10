import React from "react";
import "./RegressionTable.css";

export default function HausmanComparison({ fe, re, haus }) {
  if (!fe || !re || !haus) return null;

  const feRows = fe.results || [];
  const reRows = re.results || [];

  const predictors = feRows
    .map((x) => x.feature || x.variable || x.name)
    .filter((v) => v && v !== "Intercept");

  const merged = predictors.map((p) => {
    const feRow = feRows.find((r) => (r.feature || r.variable) === p);
    const reRow = reRows.find((r) => (r.feature || r.variable) === p);

    return {
      variable: p,
      fe: feRow?.estimate ?? null,
      re: reRow?.estimate ?? null,
      diff:
        feRow && reRow && feRow.estimate != null && reRow.estimate != null
          ? feRow.estimate - reRow.estimate
          : null,
    };
  });

  return (
    <div className="reg-card">
      <h2 className="reg-title">Fixed vs Random Effects Comparison</h2>

      <table className="reg-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>FE Coef</th>
            <th>RE Coef</th>
            <th>Difference</th>
          </tr>
        </thead>

        <tbody>
          {merged.map((row, i) => (
            <tr key={i}>
              <td>{row.variable}</td>
              <td>{row.fe?.toFixed?.(4)}</td>
              <td>{row.re?.toFixed?.(4)}</td>
              <td>{row.diff?.toFixed?.(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="haus-summary">
        <p><b>Hausman Test:</b></p>
        <p>χ²({haus.df}) = {haus.statistic.toFixed(4)}</p>
        <p>P-value = {haus.pvalue.toFixed(4)}</p>

        <p className="haus-conclusion">
          Conclusion: <b>{haus.interpretation}</b>
        </p>
      </div>
    </div>
  );
}
