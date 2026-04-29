import { commonInfo } from "./data/kindergartens.js";
import {
  Header,
  classLabel,
  mapEmbedUrl,
  googleMapUrl,
  directionsUrl,
  formatDistance,
  hasConfiguredAddress,
} from "./App.jsx";

export function DetailPage({ school, activeHomes }) {
  const feeInfo =
    school.type === "非營利"
      ? commonInfo.nonprofitFee
      : school.type === "準公共"
        ? commonInfo.quasiPublicFee
        : commonInfo.publicFee;

  return (
    <>
      <Header />
      <main className="detail-page">
        <a className="back-link" href="#/">
          回清單
        </a>
        <section className="detail-hero">
          <div>
            <p className="eyebrow">
              {school.district} · {school.type}
            </p>
            <h1>{school.name}</h1>
          </div>
          <div className="detail-score">
            <strong>{Number.isFinite(school.vacancies) ? school.vacancies : "待查"}</strong>
            <span>總缺額</span>
          </div>
        </section>

        <section className="detail-layout">
          <div className="detail-main">
            <InfoBlock title="基本資訊">
              <dl className="info-list">
                <div>
                  <dt>地址</dt>
                  <dd>{school.address}</dd>
                </div>
                <div>
                  <dt>班別缺額</dt>
                  <dd>{classLabel(school)}</dd>
                </div>
                <div>
                  <dt>電話</dt>
                  <dd>{school.phone || "待補"}</dd>
                </div>
              </dl>
            </InfoBlock>

            <InfoBlock title="上下課、費用、教學模式">
              <ul className="plain-list">
                <li>{commonInfo.schedule}</li>
                <li>{feeInfo}</li>
                <li>{commonInfo.teaching}</li>
              </ul>
            </InfoBlock>

            <InfoBlock title="爸媽實地觀察重點">
              <ul className="check-list">
                <li>老師跟孩子說話的語氣：是否蹲下來、能等待孩子回答。</li>
                <li>孩子情緒處理：哭鬧、衝突、如廁事故時怎麼陪伴。</li>
                <li>作息與戶外時間：每天戶外活動多久，雨天備案是什麼。</li>
                <li>午睡與餐點：是否強迫吃完、午睡不睡怎麼安排。</li>
                <li>親師溝通：聯絡簿、照片、突發事件通知速度。</li>
                <li>安全動線：門禁、接送身分確認、樓梯與遊具維護。</li>
                <li>課後留園：名額、費用、最晚接回時間、寒暑假安排。</li>
              </ul>
            </InfoBlock>

            <InfoBlock title="備註">
              <ul className="plain-list">
                {school.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </InfoBlock>
          </div>

          <aside className="detail-side">
            <iframe title={`${school.name} Google Map`} src={mapEmbedUrl(school)} loading="lazy" />
            <a className="primary-action full" href={googleMapUrl(school)} target="_blank" rel="noreferrer">
              Google Maps
            </a>
            {hasConfiguredAddress(activeHomes.homeA) && (
              <a
                className="secondary-action full"
                href={directionsUrl(activeHomes.homeA.address, school)}
                target="_blank"
                rel="noreferrer"
              >
                從 {activeHomes.homeA.label} 導航 ({formatDistance(school.homeDistances.homeA)})
              </a>
            )}
            {hasConfiguredAddress(activeHomes.homeB) && (
              <a
                className="secondary-action full"
                href={directionsUrl(activeHomes.homeB.address, school)}
                target="_blank"
                rel="noreferrer"
              >
                從 {activeHomes.homeB.label} 導航 ({formatDistance(school.homeDistances.homeB)})
              </a>
            )}
          </aside>
        </section>
      </main>
    </>
  );
}

function InfoBlock({ title, children }) {
  return (
    <section className="info-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function CommuteCard({ home, school, distance }) {
  const walkHint = !Number.isFinite(distance)
    ? "自訂地址請用 Google Maps 看即時車程"
    : distance <= 1.2
      ? "可評估步行或推車"
      : distance <= 2.5
        ? "騎車/開車較穩"
        : "需抓尖峰車程";
  return (
    <article className="commute-card">
      <h3>{home.label}</h3>
      <strong>{formatDistance(distance)}</strong>
      {/* <p>{walkHint}</p> */}
      <a href={directionsUrl(home.address, school)} target="_blank" rel="noreferrer">
        開路線
      </a>
    </article>
  );
}
