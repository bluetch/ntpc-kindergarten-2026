import { useEffect, useMemo, useState } from "react";
import {
  admissionTimeline,
  commonInfo,
  homes,
  kindergartens,
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

const emptyHomeInputs = {
  zhonghe: {
    label: "",
    address: "",
  },
  yonghe: {
    label: "",
    address: "",
  },
};

const hydrateHomeInputs = (savedHomes = {}) =>
  Object.fromEntries(
    Object.entries(defaultHomeInputs).map(([key, defaultHome]) => {
      const savedHome = savedHomes[key] ?? {};
      return [
        key,
        {
          label: typeof savedHome.label === "string" ? savedHome.label : defaultHome.label,
          address: typeof savedHome.address === "string" ? savedHome.address : defaultHome.address,
        },
      ];
    }),
  );

const areHomesEmpty = (homeInputs) =>
  Object.values(homeInputs).every((home) => !home.label.trim() && !home.address.trim());

const timelineWindows = [
  { start: "2026-04-29T09:00:00+08:00", end: "2026-04-29T23:59:59+08:00" },
  { start: "2026-04-30T10:00:00+08:00", end: "2026-05-07T16:00:00+08:00" },
  { start: "2026-05-08T00:00:00+08:00", end: "2026-05-12T23:59:59+08:00" },
  { start: "2026-05-13T00:00:00+08:00", end: "2026-05-14T16:00:00+08:00" },
  { start: "2026-05-19T12:00:00+08:00", end: "2026-05-19T14:59:59+08:00" },
  { start: "2026-05-19T15:00:00+08:00", end: "2026-05-20T18:00:00+08:00" },
];

const timelineStatusLabels = {
  past: "已完成",
  current: "進行中",
  future: "未開始",
};

const guideReferences = [
  {
    label: "新北市公立及非營利幼兒園招生網站",
    url: "https://kid123.ntpc.edu.tw/",
    note: "看抽籤、缺額、資格與報到時程。",
  },
  {
    label: "教育部：0-6歲國家一起養政策",
    url: "https://www.edu.tw/News_Content4.aspx?n=D33B55D537402BAA&s=1F066099DDDA393B&sms=954974C68391B710",
    note: "看補助、平價教保與 2-6 歲入園政策。",
  },
  {
    label: "教育部：非營利幼兒園每月費用上限說明",
    url: "https://www.edu.tw/News_Content.aspx?n=9E7AC85F1954DDA8&s=728F26CEC689313F",
    note: "看非營利的定位與家長負擔。",
  },
  {
    label: "教育部：準公共幼兒園政策說明",
    url: "https://www.edu.tw/News_Content.aspx?n=9E7AC85F1954DDA8&s=95DED5DF14CE9352",
    note: "看準公共制度與費用概念。",
  },
  {
    label: "親子天下：幼兒園怎麼選？4 步驟",
    url: "https://site.parenting.com.tw/home/school_preschool_info-1398",
    note: "看參觀流程、觀察重點與孩子適應。",
  },
  {
    label: "Kindie：公立、非營利、準公共、私立比較",
    url: "https://kindie.tw/guides/preschool-types",
    note: "看類型差異、時段與收費範圍。",
  },
];

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

const getTimelineStatus = (index, now = new Date()) => {
  const window = timelineWindows[index];
  if (!window) return "future";
  const start = new Date(window.start);
  const end = new Date(window.end);
  if (now < start) return "future";
  if (now > end) return "past";
  return "current";
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

const formatMinutes = (minutes) => `${Math.max(1, Math.round(minutes))}分`;

const formatMinuteRange = ([min, max]) => {
  const low = Math.max(1, Math.round(min));
  const high = Math.max(low, Math.round(max));
  return low === high ? formatMinutes(low) : `${low}-${high}分`;
};

const estimateCommuteTimes = (km) => {
  if (!Number.isFinite(km)) return null;
  const roadKm = Math.max(km * 1.35, km + 0.25);
  return {
    car: [roadKm * 2.5 + 3, roadKm * 4.3 + 8],
    scooter: [roadKm * 2.3 + 2, roadKm * 3.8 + 5],
    transit: [roadKm * 3.4 + 10, roadKm * 6 + 18],
  };
};

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
      const address = customHome.address.trim();
      const fallbackLabel = key === "zhonghe" ? "接送地址 A" : "接送地址 B";
      const label = customHome.label.trim() || fallbackLabel;
      const coordinates = address === homes[key].address ? { lat: homes[key].lat, lng: homes[key].lng } : { lat: null, lng: null };
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
    nearestHomeKey: nearest?.key ?? null,
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
      return saved ? hydrateHomeInputs(JSON.parse(saved)) : defaultHomeInputs;
    } catch {
      return defaultHomeInputs;
    }
  });

  useEffect(() => {
    if (areHomesEmpty(customHomes)) {
      window.localStorage.removeItem(HOME_STORAGE_KEY);
      return;
    }
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

  const resetHomes = () => setCustomHomes(emptyHomeInputs);

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
  if (hash === "#/guide") {
    return <GuidePage />;
  }
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
        <a href="#/guide">挑選指南</a>
        <a href="https://github.com/bluetch/ntpc-kindergarten-2026" target="_blank" rel="noreferrer">
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

        <TimelineBand />

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
              <p>距離與路程為快速估算，實際車程、停車與尖峰路況請開 Google Maps 路線確認。</p>
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

        <GuideTeaser />
      </main>
    </>
  );
}

function TimelineBand() {
  const now = new Date();

  return (
    <section className="timeline-band" aria-label="115 學年度招生時程">
      {admissionTimeline.map((item, index) => {
        const status = getTimelineStatus(index, now);
        return (
          <article className={`timeline-step is-${status}`} key={item.date}>
            <div className="timeline-content">
              <em>{timelineStatusLabels[status]}</em>
              <strong>{item.date}</strong>
              <span>{item.label}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function HomeSettingsCard({ customHomes, resetHomes, updateHome }) {
  return (
    <section className="home-settings-card" aria-label="自訂接送地址">
      <div className="mini-heading">
        <h3>接送地址</h3>
        <button type="button" onClick={resetHomes}>
          清除
        </button>
      </div>
      {Object.entries(customHomes).map(([key, home]) => (
        <fieldset key={key}>
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
      </div>
      <HomeDistanceList school={school} />
      <div className="card-actions">
        <a href={`#/kindergarten/${school.id}`}>詳細</a>
        <button type="button" onClick={onMap}>
          地圖
        </button>
      </div>
    </article>
  );
}

function HomeDistanceList({ school }) {
  const entries = Object.entries(school.homeLabels);

  if (entries.length < 2) return null;

  return (
    <div className="home-distance-list" aria-label="接送地址距離">
      {entries.map(([key, label]) => {
        const distance = school.homeDistances[key];
        const isNearest = key === school.nearestHomeKey && Number.isFinite(distance);
        const estimates = estimateCommuteTimes(distance);
        return (
          <article className={isNearest ? "is-nearest" : ""} key={key}>
            <div className="home-distance-main">
              <span>{label}</span>
              <strong>{formatDistance(distance)}</strong>
            </div>
            {estimates ? (
              <div className="route-estimates">
                <span>開車約 {formatMinuteRange(estimates.car)}</span>
                <span>機車約 {formatMinuteRange(estimates.scooter)}</span>
                <span>大眾約 {formatMinuteRange(estimates.transit)}</span>
              </div>
            ) : (
              <p>自訂地址請開 Google Maps 查即時路程</p>
            )}
          </article>
        );
      })}
    </div>
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

function GuideTeaser() {
  return (
    <section className="guide" id="guide">
      <div className="section-heading">
        <div>
          <p className="eyebrow">新手爸媽快速版</p>
          <h2>把指南獨立出來，分享給家人更方便</h2>
        </div>
      </div>

      <div className="sources guide-cta">
        <h3>獨立網址</h3>
        <p>
          指南頁整理了常見選園分析、參觀清單、紅旗訊號、公立/非營利/準公共差異與抽籤排志願建議，適合直接丟給家人討論。
        </p>
        <div>
          <a href="#/guide">開啟挑選指南頁</a>
        </div>
      </div>
    </section>
  );
}

function GuidePage() {
  return (
    <>
      <Header />
      <main className="detail-page guide-page">
        <a className="back-link" href="#/">
          回幼兒園清單
        </a>
        <section className="detail-hero">
          <div>
            <p className="eyebrow">幼兒園挑選指南</p>
            <h1>把常見問題拆成可討論、可排序的幾個決策點</h1>
            <p>這頁把網路上常見的家長分析整理成實際可用的版本，適合和伴侶、長輩一起對焦。</p>
          </div>
          <div className="detail-score">
            <strong>Guide</strong>
            <span>#/guide</span>
          </div>
        </section>

        <section className="detail-main guide-main">
          <InfoBlock title="一開始先看什麼">
            <div className="guide-grid">
              <article>
                <h3>生活圈優先</h3>
                <p>多數家長最後卡住的不是課程名稱，而是每天接送。離家、離公司、離祖父母支援點的動線，通常比單一亮點更影響長期穩定。</p>
              </article>
              <article>
                <h3>班別分開看</h3>
                <p>2 歲專班和 3-5 歲班不要混在一起比較。對雙薪家庭來說，2 歲專班名額、作息與照顧強度往往才是真正的決策點。</p>
              </article>
              <article>
                <h3>先看能不能上</h3>
                <p>公立與非營利通常要抽籤，準公共多半是直接報名。先把「錄取方式」和「時間壓力」釐清，才不會把大量精力放在根本進不去的選項。</p>
              </article>
            </div>
          </InfoBlock>

          <InfoBlock title="公立、非營利、準公共怎麼看">
            <div className="guide-grid">
              <article>
                <h3>公立</h3>
                <p>常見印象是便宜、穩定、校園資源完整。代價通常是名額少、抽籤競爭高，寒暑假與延托安排也要逐園確認。</p>
              </article>
              <article>
                <h3>非營利</h3>
                <p>常見優勢是收費平價、全年托育友善、由法人承辦而有明確理念。家長最常比較的是師資穩定度、延托品質與是否真的落實教學理念。</p>
              </article>
              <article>
                <h3>準公共</h3>
                <p>常見優勢是不用和公幼同一套大抽籤，報名彈性高。家長最在意的則是各園差異比較大，除了月費，還要看額外收費、課程真實樣貌與教師流動。</p>
              </article>
            </div>
          </InfoBlock>

          <InfoBlock title="爸媽最常在意的比較點">
            <ul className="check-list">
              <li>接送成本：平日早上 7:30-8:30、下午 16:00-18:00 的實際路況，比地圖上的直線距離更重要。</li>
              <li>照顧時段：最晚幾點接回、課後留園是否穩定開、寒暑假安排怎麼算。</li>
              <li>教學風格：是重生活自理、主題探索、戶外活動，還是偏學科、雙語、才藝導向。</li>
              <li>環境與安全：教室採光、戶外空間、樓梯動線、門禁、接送身分確認。</li>
              <li>親師溝通：聯絡頻率、照片回饋、事件通報速度，以及老師說明事情是否清楚不防禦。</li>
              <li>師資穩定：家長常說「理念」很好，但實際體感常常取決於老師留任率與班級氣氛。</li>
            </ul>
          </InfoBlock>

          <InfoBlock title="實地參觀時要觀察什麼">
            <div className="guide-grid">
              <article>
                <h3>先看老師怎麼講話</h3>
                <p>老師會不會蹲下來、願不願意等孩子回應、衝突時是貼標籤還是幫忙收情緒，這些比簡章文案更接近真實日常。</p>
              </article>
              <article>
                <h3>再看孩子是不是自在</h3>
                <p>孩子是否敢主動移動、問問題、拿教材，通常能反映教室是高壓管理還是有安全感的環境。</p>
              </article>
              <article>
                <h3>最後問細節</h3>
                <p>午睡不睡怎麼辦、挑食怎麼處理、如廁事故怎麼陪、臨時生病誰通知，這些細節最能看出園方價值觀。</p>
              </article>
            </div>
          </InfoBlock>

          <InfoBlock title="常見紅旗">
            <ul className="check-list">
              <li>只強調成果展示，卻說不清楚日常作息、師生互動和生活照顧流程。</li>
              <li>談收費時很模糊，額外教材費、活動費、制服費、延托費拆很多層。</li>
              <li>不願回答老師流動、班級人數、午睡與如廁處理等具體問題。</li>
              <li>Google 評論低分內容集中在同一類問題，而且近期仍持續出現。</li>
              <li>家長參觀時看到孩子大多被命令、被催促，很少有自在探索或正常對話。</li>
            </ul>
          </InfoBlock>

          <InfoBlock title="抽籤與排志願的小策略">
            <ul className="check-list">
              <li>先分成 A 級「真的能每天接送」、B 級「勉強可行」、C 級「只有中籤才硬撐」三層，不要把所有園所視為同等可接受。</li>
              <li>把 2 歲專班與 3-5 歲班分開討論，避免總缺額大就誤以為自己要的班別也多。</li>
              <li>家人若意見不同，先對齊優先順序：距離、費用、時段、教學、戶外空間，哪個一定不能退。</li>
              <li>抽籤前就先想好候補方案，例如準公共、私幼、祖父母支援或接送分工，不然中籤前後的焦慮會放大很多。</li>
            </ul>
          </InfoBlock>

          <InfoBlock title="整理來源">
            <div className="sources">
              <h3>這頁主要參考</h3>
              <p>以官方政策與常見家長整理交叉比對後濃縮，適合先建立決策框架；實際收費、時段與招生仍以各園公告為準。</p>
              <div>
                {guideReferences.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer" title={source.note}>
                    {source.label}
                  </a>
                ))}
              </div>
            </div>
          </InfoBlock>
        </section>
      </main>
    </>
  );
}

export default App;
