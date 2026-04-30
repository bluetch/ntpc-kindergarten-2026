import React from "react";
import Header from "./Header.jsx";
import { sources } from "./data/kindergartens.js";
import { Link } from "react-router-dom";

const getSourceMeta = (source, index) => {
  const hostname = new URL(source.url).hostname.replace(/^www\./, "");

  if (hostname.includes("ntpc.edu.tw") || hostname.includes("ntpc.gov.tw")) {
    return {
      category: "官方",
      accentClass: "is-official",
      purpose: index < 2 ? "先看時程、缺額與登記規則" : "查教育局公告與在地名冊",
      trustLabel: "第一手公告",
    };
  }

  if (hostname.includes("olc.tw") || hostname.includes("kindyinfo.com") || hostname.includes("youn.com.tw")) {
    return {
      category: "民間整理",
      accentClass: "is-community",
      purpose: "交叉比對收費、口碑與裁罰資訊",
      trustLabel: "需回官方複核",
    };
  }

  return {
    category: "補充參考",
    accentClass: "is-reference",
    purpose: "補充園所背景與連結入口",
    trustLabel: "作為輔助資料",
  };
};

export default function SourcesPage() {
  return (
    <>
      <Header />
      <main className="detail-page sources-page">
        <Link className="back-link" to="/">
          回清單
        </Link>
        <section className="sources-section">
          <div className="section-heading sources-heading">
            <div>
              <h2>資料來源清單</h2>
            </div>
          </div>

          <div className="sources-grid">
            {sources.map((source, index) => {
              const meta = getSourceMeta(source, index);
              const hostname = new URL(source.url).hostname.replace(/^www\./, "");

              return (
                <article key={source.url} className={`source-card ${meta.accentClass}`}>
                  <div className="source-card-top">
                    <span className="source-rank">#{index + 1}</span>
                    <div className="source-badges">
                      <span>{meta.category}</span>
                      <span>{meta.trustLabel}</span>
                    </div>
                  </div>

                  <div className="source-card-copy">
                    <h3 className="source-title">{source.label}</h3>
                    <p className="source-purpose">適合用來：{meta.purpose}</p>
                    <p className="source-note">
                      {source.note ?? "可作為本專案整理過程中的對照來源，建議與其他資料交叉確認。"}
                    </p>
                  </div>

                  <dl className="source-meta">
                    <div>
                      <dt>網站</dt>
                      <dd>{hostname}</dd>
                    </div>
                  </dl>

                  <div className="source-actions">
                    <a href={source.url} target="_blank" rel="noreferrer" className="secondary-action">
                      查看網站
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
