import { useEffect, useMemo, useState } from "react";
import {
  admissionTimeline,
  commonInfo,
  homes,
  kindergartens,
  sources,
} from "./data/kindergartens.js";

const HOME_STORAGE_KEY = "ntpc-kindergarten-picker-homes";

const defaultHomeInputs = {
  zhonghe: {
    label: homes.zhonghe.label,
    address: homes.zhonghe.address,
  },
  yonghe: {
    label: homes.yonghe.label,
    address: homes.yonghe.address,
  },
};

const googleMapUrl = (destination) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

const directionsUrl = (origin, destination, mode = "driving") =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    origin,
  )}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;

const mapEmbedUrl = (destination) =>
  `https://www.google.com/maps?q=${encodeURIComponent(destination)}&output=embed`;

const totalVacancies = (school) =>
  school.classes.reduce((sum, item) => sum + (Number.isFinite(item.vacancies) ? item.vacancies : 0), 0);

const classLabel = (school) =>
  school.classes
    .map((item) => `${item.name} ${Number.isFinite(item.vacancies) ? item.vacancies : "待查"}`)
    .join(" / ");

const classVacancies = (school, classType) => {
  if (classType === "全部") return totalVacancies(school);
  const matchedClass = school.classes.find((item) => item.name === classType);
  return Number.isFinite(matchedClass?.vacancies) ? matchedClass.vacancies : null;
};

const classVacancyLabel = (classType) => {
  if (classType === "2歲專班") return "2歲缺額";
  if (classType === "3-5歲班") return "3-5歲缺額";
  return "總缺額";
};

const hasCoordinates = (place) =>
  Number.isFinite(place?.lat) && Number.isFinite(place?.lng);

const haversineKm = (a, b) => {
  if (!hasCoordinates(a) || !hasCoordinates(b)) return null;
  const radius = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const formatDistance = (km) => (Number.isFinite(km) ? `${km.toFixed(km < 1 ? 2 : 1)} km` : "開 Maps");

const distanceSortValue = (km) => (Number.isFinite(km) ? km : Number.POSITIVE_INFINITY);

const vacancySortValue = (count) => (Number.isFinite(count) ? count : Number.NEGATIVE_INFINITY);

const getHomeDistance = (school, homeKey) => {
  if (homeKey === "zhonghe") return school.homeDistances.zhonghe;
  if (homeKey === "yonghe") return school.homeDistances.yonghe;
  return school.nearestKm;
};

const resolveHomes = (customHomes) =>
  Object.fromEntries(
    Object.entries(defaultHomeInputs).map(([key, defaultHome]) => {
      const customHome = customHomes[key] ?? defaultHome;
      const address = customHome.address.trim() || defaultHome.address;
      const label = customHome.label.trim() || defaultHome.label;
      const coordinates =
        address === homes[key].address ? { lat: homes[key].lat, lng: homes[key].lng } : { lat: null, lng: null };
      return [key, { ...defaultHome, ...coordinates, label, address }];
    }),
  );

const enrichSchool = (school, activeHomes) => {
  const zhongheKm = haversineKm(activeHomes.zhonghe, school);
  const yongheKm = haversineKm(activeHomes.yonghe, school);
  const availableDistances = [
    { key: "zhonghe", label: activeHomes.zhonghe.label, distance: zhongheKm },
    { key: "yonghe", label: activeHomes.yonghe.label, distance: yongheKm },
  ].filter((item) => Number.isFinite(item.distance));
  const nearest = availableDistances.sort((a, b) => a.distance - b.distance)[0] ?? null;
  return {
    ...school,
    vacancies: totalVacancies(school),
    homeDistances: {
      zhonghe: zhongheKm,
      yonghe: yongheKm,
    },
    homeLabels: {
      zhonghe: activeHomes.zhonghe.label,
      yonghe: activeHomes.yonghe.label,
    },
    zhongheKm,
    yongheKm,
    nearestKm: nearest?.distance ?? null,
    nearestHome: nearest?.label ?? "自訂地址",
  };
};

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onHash = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

function useCustomHomes() {
  const [customHomes, setCustomHomes] = useState(() => {
    try {
      const saved = window.localStorage.getItem(HOME_STORAGE_KEY);
      return saved ? { ...defaultHomeInputs, ...JSON.parse(saved) } : defaultHomeInputs;
    } catch {
      return defaultHomeInputs;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify(customHomes));
  }, [customHomes]);

  const updateHome = (key, field, value) => {
    setCustomHomes((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }));
  };

  const resetHomes = () => setCustomHomes(defaultHomeInputs);

  return { customHomes, updateHome, resetHomes };
}

function App() {
  const hash = useHashRoute();
  const { customHomes, updateHome, resetHomes } = useCustomHomes();
  const activeHomes = useMemo(() => resolveHomes(customHomes), [customHomes]);
  const enrichedSchools = useMemo(
    () => kindergartens.map((school) => enrichSchool(school, activeHomes)),
    [activeHomes],
  );
  const detailMatch = hash.match(/^#\/kindergarten\/(.+)$/);
  const school = detailMatch
    ? enrichedSchools.find((item) => item.id === decodeURIComponent(detailMatch[1]))
    : null;

  if (school) {
    return <DetailPage school={school} activeHomes={activeHomes} />;
  }

  return (
    <ListPage
      activeHomes={activeHomes}
      customHomes={customHomes}
      enrichedSchools={enrichedSchools}
      resetHomes={resetHomes}
      updateHome={updateHome}
    />
  );
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#/" aria-label="回清單首頁">
        <span className="brand-mark">幼</span>
        <span>
          <strong>中永和幼兒園抽籤小幫手</strong>
          <small>給忙碌新手爸媽的暖暖整理包</small>
        </span>
      </a>
      <nav>
        <a href="#list">清單</a>
        <a href="#guide">挑選指南</a>
        <a href="https://github.com/bluetch" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}

function ListPage({ activeHomes, customHomes, enrichedSchools, resetHomes, updateHome }) {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("全部");
  const [type, setType] = useState("全部");
  const [classType, setClassType] = useState("3-5歲班");
  const [homeKey, setHomeKey] = useState("nearest");
  const [maxDistance, setMaxDistance] = useState("全部");
  const [sortBy, setSortBy] = useState("distance");
  const [selectedId, setSelectedId] = useState(enrichedSchools[0].id);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = enrichedSchools.filter((school) => {
      const haystack = `${school.name} ${school.address} ${school.district} ${school.type}`.toLowerCase();
      const distance = getHomeDistance(school, homeKey);
      return (
        (!needle || haystack.includes(needle)) &&
        (district === "全部" || school.district === district) &&
        (type === "全部" || school.type === type) &&
        (classType === "全部" || school.classes.some((item) => item.name === classType)) &&
        (maxDistance === "全部" || !Number.isFinite(distance) || distance <= Number(maxDistance))
      );
    });

    return result.sort((a, b) => {
      const distanceA = getHomeDistance(a, homeKey);
      const distanceB = getHomeDistance(b, homeKey);
      if (sortBy === "distance") return distanceSortValue(distanceA) - distanceSortValue(distanceB);
      if (sortBy === "vacancies") {
        return vacancySortValue(classVacancies(b, classType)) - vacancySortValue(classVacancies(a, classType));
      }
      return a.name.localeCompare(b.name, "zh-Hant");
    });
  }, [classType, district, homeKey, maxDistance, query, sortBy, type]);

  const selected = enrichedSchools.find((school) => school.id === selectedId) ?? filtered[0] ?? enrichedSchools[0];

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">新北市 115 學年度</p>
            <h1>把中和、永和幼兒園變成一張好懂的家人清單</h1>
            <p>
              整理公立、國小/國中附幼與非營利幼兒園缺額，搭配兩個家的距離、Google
              地圖、抽籤時程與訪園檢查重點。
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#list">
                看清單
              </a>
              <a className="secondary-action" href="https://kid123.ntpc.edu.tw/" target="_blank" rel="noreferrer">
                官方招生網站
              </a>
            </div>
          </div>
          <div className="play-scene" aria-hidden="true">
            <div className="sun" />
            <div className="cloud cloud-one" />
            <div className="cloud cloud-two" />
            <div className="school-house">
              <span>ABC</span>
            </div>
            <div className="bus">
              <span />
              <span />
            </div>
          </div>
        </section>

        <section className="timeline-band" aria-label="115 學年度招生時程">
          {admissionTimeline.map((item) => (
            <article key={item.date}>
              <strong>{item.date}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </section>

        <section className="layout" id="list">
          <aside className="filters" aria-label="篩選幼兒園">
            <h2>篩選</h2>
            <label>
              搜尋
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="園名、地址、區域" />
            </label>
            <label>
              區域
              <select value={district} onChange={(event) => setDistrict(event.target.value)}>
                <option>全部</option>
                <option>中和區</option>
                <option>永和區</option>
              </select>
            </label>
            <label>
              類型
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option>全部</option>
                <option>公立專設</option>
                <option>國小附幼</option>
                <option>國中附幼</option>
                <option>非營利</option>
              </select>
            </label>
            <label>
              班別
              <select value={classType} onChange={(event) => setClassType(event.target.value)}>
                <option>全部</option>
                <option>2歲專班</option>
                <option>3-5歲班</option>
              </select>
            </label>
            <label>
              距離基準
              <select value={homeKey} onChange={(event) => setHomeKey(event.target.value)}>
                <option value="nearest">離任一家最近</option>
                <option value="zhonghe">{activeHomes.zhonghe.label}</option>
                <option value="yonghe">{activeHomes.yonghe.label}</option>
              </select>
            </label>
            <label>
              最大距離
              <select value={maxDistance} onChange={(event) => setMaxDistance(event.target.value)}>
                <option>全部</option>
                <option value="1">1 km 內</option>
                <option value="2">2 km 內</option>
                <option value="3">3 km 內</option>
                <option value="5">5 km 內</option>
              </select>
            </label>
            <label>
              排序
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="distance">距離近到遠</option>
                <option value="vacancies">缺額多到少</option>
                <option value="name">園名筆畫/字序</option>
              </select>
            </label>
            <HomeSettingsCard
              customHomes={customHomes}
              resetHomes={resetHomes}
              updateHome={updateHome}
            />
          </aside>

          <section className="results" aria-label="幼兒園清單">
            <div className="section-heading">
              <div>
                <p className="eyebrow">共 {filtered.length} 間符合</p>
                <h2>幼兒園一覽</h2>
              </div>
              <p>距離為直線粗估，實際車程與停車請開 Google Maps 路線確認。</p>
            </div>

            <div className="school-grid">
              {filtered.map((school) => (
                <SchoolCard
                  key={school.id}
                  school={school}
                  classType={classType}
                  active={school.id === selected.id}
                  onMap={() => setSelectedId(school.id)}
                />
              ))}
            </div>
          </section>

          <aside className="map-panel" aria-label="Google Map 預覽">
            <div className="map-sticky">
              <h2>地圖預覽</h2>
              <p>{selected.name}</p>
              <iframe title={`${selected.name} Google Map`} src={mapEmbedUrl(selected.address)} loading="lazy" />
              <div className="map-actions">
                <a href={googleMapUrl(selected.address)} target="_blank" rel="noreferrer">
                  Google Maps
                </a>
                <a href={directionsUrl(activeHomes.zhonghe.address, selected.address)} target="_blank" rel="noreferrer">
                  {activeHomes.zhonghe.label}路線
                </a>
                <a href={directionsUrl(activeHomes.yonghe.address, selected.address)} target="_blank" rel="noreferrer">
                  {activeHomes.yonghe.label}路線
                </a>
              </div>
            </div>
          </aside>
        </section>

        <GuideSection />
      </main>
    </>
  );
}

function HomeSettingsCard({ customHomes, resetHomes, updateHome }) {
  return (
    <section className="home-settings-card" aria-label="自訂接送地址">
      <div className="mini-heading">
        <h3>接送地址</h3>
        <button type="button" onClick={resetHomes}>
          還原
        </button>
      </div>
      {Object.entries(customHomes).map(([key, home]) => (
        <fieldset key={key}>
          <legend>{key === "zhonghe" ? "預設中和家" : "預設永和家"}</legend>
          <label>
            名稱
            <input value={home.label} onChange={(event) => updateHome(key, "label", event.target.value)} />
          </label>
          <label>
            地址
            <input value={home.address} onChange={(event) => updateHome(key, "address", event.target.value)} />
          </label>
        </fieldset>
      ))}
      <p className="field-note">
        名稱與導航連結會即時更新；自訂地址的精準距離需開 Google Maps 路線確認。
      </p>
    </section>
  );
}

function SchoolCard({ school, classType, active, onMap }) {
  const vacancyCount = classVacancies(school, classType);
  return (
    <article className={`school-card ${active ? "is-active" : ""}`}>
      <div className="card-topline">
        <span>{school.district}</span>
        <span>{school.type}</span>
      </div>
      <h3>{school.name}</h3>
      <p className="address">{school.address}</p>
      <div className="metrics">
        <span>
          <strong>{Number.isFinite(vacancyCount) ? vacancyCount : "待查"}</strong>
          {classVacancyLabel(classType)}
        </span>
        <span>
          <strong>{formatDistance(school.nearestKm)}</strong>
          最近 {school.nearestHome}
        </span>
      </div>
      <div className="card-actions">
        <a href={`#/kindergarten/${school.id}`}>詳細</a>
        <button type="button" onClick={onMap}>
          地圖
        </button>
        <a href={googleMapUrl(school.address)} target="_blank" rel="noreferrer">
          評價
        </a>
      </div>
    </article>
  );
}

function DetailPage({ school, activeHomes }) {
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
            <p>{school.address}</p>
          </div>
          <div className="detail-score">
            <strong>{school.vacancies || "待查"}</strong>
            <span>總缺額</span>
          </div>
        </section>

        <section className="detail-layout">
          <div className="detail-main">
            <InfoBlock title="基本資訊">
              <dl className="info-list">
                <div>
                  <dt>園所編號</dt>
                  <dd>{school.code}</dd>
                </div>
                <div>
                  <dt>班別缺額</dt>
                  <dd>{classLabel(school)}</dd>
                </div>
                <div>
                  <dt>電話</dt>
                  <dd>{school.phone || "待補"}</dd>
                </div>
                <div>
                  <dt>Google 評價</dt>
                  <dd>{school.googleRating ?? "待人工補入，請先外開 Google Maps 查看最新評論"}</dd>
                </div>
              </dl>
            </InfoBlock>

            <InfoBlock title="距離與接送">
              <div className="commute-grid">
                <CommuteCard school={school} home={activeHomes.zhonghe} distance={school.homeDistances.zhonghe} />
                <CommuteCard school={school} home={activeHomes.yonghe} distance={school.homeDistances.yonghe} />
              </div>
              <p className="field-note">
                接送請實際用平日 07:30-08:30、16:00-18:00 測一次路線。巷弄型園所要特別看臨停、雨天走路距離與娃娃車規定。
              </p>
            </InfoBlock>

            <InfoBlock title="上下課、費用、教學模式">
              <ul className="plain-list">
                <li>{commonInfo.schedule}</li>
                <li>{school.type === "非營利" ? commonInfo.nonprofitFee : commonInfo.publicFee}</li>
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
            <iframe title={`${school.name} Google Map`} src={mapEmbedUrl(school.address)} loading="lazy" />
            <a className="primary-action full" href={googleMapUrl(school.address)} target="_blank" rel="noreferrer">
              開啟 Google Maps / 評價
            </a>
            <a
              className="secondary-action full"
              href={directionsUrl(activeHomes.zhonghe.address, school.address)}
              target="_blank"
              rel="noreferrer"
            >
              從{activeHomes.zhonghe.label}導航
            </a>
            <a
              className="secondary-action full"
              href={directionsUrl(activeHomes.yonghe.address, school.address)}
              target="_blank"
              rel="noreferrer"
            >
              從{activeHomes.yonghe.label}導航
            </a>
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
      <p>{walkHint}</p>
      <a href={directionsUrl(home.address, school.address)} target="_blank" rel="noreferrer">
        開路線
      </a>
    </article>
  );
}

function GuideSection() {
  return (
    <section className="guide" id="guide">
      <div className="section-heading">
        <div>
          <p className="eyebrow">新手爸媽快速版</p>
          <h2>怎麼排志願比較不慌</h2>
        </div>
      </div>

      <div className="guide-grid">
        <article>
          <h3>先用生活圈排序</h3>
          <p>第一輪先看離家、上班路線、祖父母支援路線。每天接送比單次評價更重要，尤其雨天和孩子生病臨時接回。</p>
        </article>
        <article>
          <h3>再看缺額和班別</h3>
          <p>2 歲專班與 3-5 歲班分開看。缺額多不一定最適合，但代表中籤機會與候補流動可能較高。</p>
        </article>
        <article>
          <h3>公立、非營利、準公共</h3>
          <p>公立通常費用低、校園穩定；非營利由政府委託法人辦理，常有明確理念；準公共多為私幼加入合作機制，收費與課程需逐園比較。</p>
        </article>
        <article>
          <h3>評價要看內容</h3>
          <p>Google 星等只能當入口。請讀低分評論的時間、事件類型與園方回應，也要查裁罰紀錄是否已改善。</p>
        </article>
      </div>

      <div className="sources">
        <h3>資料來源與更新提醒</h3>
        <p>
          目前缺額依使用者提供之 2026-04-29 公告清單整理；地址、電話參考官方/資料站公開資訊。Google
          評價即時變動，本站預設不填假分數。
        </p>
        <div>
          {sources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
              {source.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default App;
