import { useEffect, useMemo, useState } from "react";
import { DetailPage } from "./DetailPage.jsx";
import {
  admissionTimeline,
  commonInfo,
  homes,
  kindergartens,
  sources,
} from "./data/kindergartens.js";

const HOME_STORAGE_KEY = "ntpc-kindergarten-picker-homes";
const HOME_PRESET_QUERY_KEY = "home";
const KKHOME_PRESET = "kkhome";

const kkHomeInputs = {
  homeA: {
    label: homes.homeA.label,
    address: homes.homeA.address,
  },
  homeB: {
    label: homes.homeB.label,
    address: homes.homeB.address,
  },
};

const emptyHomeInputs = {
  homeA: {
    label: "",
    address: "",
  },
  homeB: {
    label: "",
    address: "",
  },
};

const hydrateHomeInputs = (savedHomes = {}) =>
  Object.fromEntries(
    Object.entries(emptyHomeInputs).map(([key, defaultHome]) => {
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

const matchesHomeInputs = (left = {}, right = {}) =>
  Object.keys(emptyHomeInputs).every((key) => {
    const leftHome = left[key] ?? {};
    const rightHome = right[key] ?? {};
    return leftHome.label === rightHome.label && leftHome.address === rightHome.address;
  });

const shouldUseKkHomePreset = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get(HOME_PRESET_QUERY_KEY) === KKHOME_PRESET;
};

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

const cleanSchoolName = (name) => name.split(/[（(]/)[0].trim();

const schoolCategoryLabel = (type) => {
  if (["公立專設", "國小附幼", "國中附幼"].includes(type)) return "公立";
  if (type === "非營利") return "非營利";
  if (type === "準公共") return "準公共";
  return "私立";
};

export const googleMapUrl = (school) => {
  if (school.mapUrl) return school.mapUrl;
  const query = `${cleanSchoolName(school.name)} ${school.address}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export const directionsUrl = (origin, school, mode = "driving") => {
  const query = `${cleanSchoolName(school.name)} ${school.address}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    origin,
  )}&destination=${encodeURIComponent(query)}&travelmode=${mode}`;
};

export const mapEmbedUrl = (school) => {
  const query = `${cleanSchoolName(school.name)} ${school.address}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
};

const totalVacancies = (school) =>
  school.classes.reduce((sum, item) => sum + (Number.isFinite(item.vacancies) ? item.vacancies : 0), 0);

export const classLabel = (school) =>
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

const totalClassVacancies = (schools, classType) =>
  schools.reduce((sum, school) => {
    const count = classVacancies(school, classType);
    return sum + (Number.isFinite(count) ? count : 0);
  }, 0);

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

export const hasConfiguredAddress = (home) => typeof home?.address === "string" && home.address.trim().length > 0;

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

export const formatDistance = (km) => (Number.isFinite(km) ? `${km.toFixed(km < 1 ? 2 : 1)} km` : "開 Maps");

const formatMinutes = (minutes) => `${Math.max(1, Math.round(minutes))}分`;

const estimateCommuteTimes = (km) => {
  if (!Number.isFinite(km)) return null;
  const roadKm = km * 1.3;
  return {
    car: roadKm * 2.2 + 0.5,
    scooter: roadKm * 2.0 + 0.3,
    walking: km * 13,
    transit: roadKm * 4 + 8,
  };
};

const distanceSortValue = (km) => (Number.isFinite(km) ? km : Number.POSITIVE_INFINITY);

const vacancySortValue = (count) => (Number.isFinite(count) ? count : Number.NEGATIVE_INFINITY);

const getHomeDistance = (school, homeKey) => {
  if (homeKey === "homeA") return school.homeDistances.homeA;
  if (homeKey === "homeB") return school.homeDistances.homeB;
  return school.nearestKm;
};

const resolveHomes = (customHomes) =>
  Object.fromEntries(
    Object.entries(kkHomeInputs).map(([key, defaultHome]) => {
      const customHome = customHomes[key] ?? defaultHome;
      const address = customHome.address.trim();
      const fallbackLabel = key === "homeA" ? "接送地址 A" : "接送地址 B";
      const label = customHome.label.trim() || fallbackLabel;
      const coordinates = address === homes[key].address ? { lat: homes[key].lat, lng: homes[key].lng } : { lat: null, lng: null };
      return [key, { ...defaultHome, ...coordinates, label, address }];
    }),
  );

const enrichSchool = (school, activeHomes) => {
  const homeAKm = haversineKm(activeHomes.homeA, school);
  const homeBKm = haversineKm(activeHomes.homeB, school);
  const availableDistances = [
    { key: "homeA", label: activeHomes.homeA.label, distance: homeAKm },
    { key: "homeB", label: activeHomes.homeB.label, distance: homeBKm },
  ].filter((item) => Number.isFinite(item.distance));
  const nearest = availableDistances.sort((a, b) => a.distance - b.distance)[0] ?? null;
  return {
    ...school,
    vacancies: totalVacancies(school),
    homeDistances: {
      homeA: homeAKm,
      homeB: homeBKm,
    },
    homeLabels: {
      homeA: activeHomes.homeA.label,
      homeB: activeHomes.homeB.label,
    },
    homeConfigured: {
      homeA: hasConfiguredAddress(activeHomes.homeA),
      homeB: hasConfiguredAddress(activeHomes.homeB),
    },
    homeAKm,
    homeBKm,
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
    if (shouldUseKkHomePreset()) {
      return kkHomeInputs;
    }

    try {
      const saved = window.localStorage.getItem(HOME_STORAGE_KEY);
      if (!saved) return emptyHomeInputs;
      const hydratedHomes = hydrateHomeInputs(JSON.parse(saved));
      return matchesHomeInputs(hydratedHomes, kkHomeInputs) ? emptyHomeInputs : hydratedHomes;
    } catch {
      return emptyHomeInputs;
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

  const resetHomes = () =>
    setCustomHomes({
      homeA: { label: "", address: "" },
      homeB: { label: "", address: "" },
    });

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
  if (hash === "#/sources") {
    return <SourcesPage />;
  }
  const detailMatch = hash.match(/^#\/kindergarten\/(.+)$/);
  const detailSchool = detailMatch
    ? enrichedSchools.find((item) => item.id === decodeURIComponent(detailMatch[1]))
    : null;

  if (detailSchool) {
    return <DetailPage school={detailSchool} activeHomes={activeHomes} />;
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

export function Header() {
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
        <a href="#/sources">資料來源</a>
        <a className="secondary-action" href="https://kid123.ntpc.edu.tw/" target="_blank" rel="noreferrer">
          官方招生網站
        </a>
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
  const [selectedId, setSelectedId] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

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
  const openMap = (schoolId) => {
    setSelectedId(schoolId);
    setIsMapOpen(true);
  };

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">新北市 115 學年度</p>
            <h1>中永和幼兒園清單</h1>
            <p>先看缺額、距離和接送成本，再決定要不要把時間花在進一步比較。</p>
            {/* <div className="hero-actions">
              <a className="primary-action" href="#list">
                看清單
              </a>
            </div> */}
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
            <p className="filter-hint">先選班別，再看距離和缺額。</p>
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
                <option>準公共</option>
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
                <option value="homeA">{activeHomes.homeA.label}</option>
                <option value="homeB">{activeHomes.homeB.label}</option>
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
              <p>符合條件 {filtered.length} 間</p>
            </div>

            <div className="school-grid">
              {filtered.map((school) => (
                <SchoolCard
                  key={school.id}
                  school={school}
                  classType={classType}
                  active={isMapOpen && school.id === selected.id}
                  onOpenMap={() => openMap(school.id)}
                />
              ))}
            </div>
          </section>
        </section>

        <MapDrawer
          activeHomes={activeHomes}
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          school={selected}
        />
      </main>
    </>
  );
}

function MapDrawer({ activeHomes, isOpen, onClose, school }) {
  if (!school) return null;

  return (
    <div className={`map-drawer-shell ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
      <button
        aria-label="關閉地圖預覽"
        className={`map-drawer-backdrop ${isOpen ? "is-open" : ""}`}
        onClick={onClose}
        type="button"
      />
      <aside className={`map-drawer ${isOpen ? "is-open" : ""}`} aria-label="Google Map 預覽">
        <div className="map-drawer-header">
          <div>
            <p className="eyebrow">地圖預覽</p>
            <h2>{school.name}</h2>
          </div>
          <button onClick={onClose} type="button">
            關閉
          </button>
        </div>
        <p className="map-drawer-address">{school.address}</p>
        <iframe title={`${school.name} Google Map`} src={mapEmbedUrl(school)} loading="lazy" />
        <div className="map-actions">
          <a href={googleMapUrl(school)} target="_blank" rel="noreferrer">
            Google Maps
          </a>
          {hasConfiguredAddress(activeHomes.homeA) && (
            <a href={directionsUrl(activeHomes.homeA.address, school)} target="_blank" rel="noreferrer">
              {activeHomes.homeA.label}路線
            </a>
          )}
          {hasConfiguredAddress(activeHomes.homeB) && (
            <a href={directionsUrl(activeHomes.homeB.address, school)} target="_blank" rel="noreferrer">
              {activeHomes.homeB.label}路線
            </a>
          )}
        </div>
      </aside>
    </div>
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
            <input
              value={home.label}
              onChange={(event) => updateHome(key, "label", event.target.value)}
              placeholder={key === "homeA" ? "接送地址 A" : "接送地址 B"}
            />
          </label>
          <label>
            地址
            <input
              value={home.address}
              onChange={(event) => updateHome(key, "address", event.target.value)}
              placeholder="請輸入接送地址"
            />
          </label>
        </fieldset>
      ))}
    </section>
  );
}

function SchoolCard({ school, classType, active, onOpenMap }) {
  const vacancyCount = classVacancies(school, classType);
  return (
    <article className={`school-card ${active ? "is-active" : ""}`}>
      <div className="card-topline">
        <span>{school.district}</span>
        <span>{schoolCategoryLabel(school.type)}</span>
      </div>
      <div className="card-title">
        <div>
          <h3>{school.name}</h3>
          <p className="address">{school.address}</p>
          {Array.isArray(school.punishRecord) && (
            <p className={`punish-badge ${school.punishRecord.length === 0 ? "is-zero" : ""}`}>
              裁罰紀錄: {school.punishRecord.length}
            </p>
          )}
        </div>
        <div className="metrics">
          <span>
            {classVacancyLabel(classType)}
            <strong>{Number.isFinite(vacancyCount) ? vacancyCount : "待查"}</strong>
          </span>
        </div>
      </div>
      <HomeDistanceList school={school} />
      <div className="card-actions">
        <a
          href={`#/kindergarten/${school.id}`}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          詳細
        </a>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenMap();
          }}
        >
          地圖
        </button>
      </div>
    </article>
  );
}

function HomeDistanceList({ school }) {
  const entries = Object.entries(school.homeLabels).filter(([key]) => school.homeConfigured[key]);

  if (entries.length === 0) return null;

  return (
    <ul className="home-distance-list" aria-label="接送地址距離">
      {entries.map(([key, label]) => {
        const distance = school.homeDistances[key];
        const isNearest = key === school.nearestHomeKey && Number.isFinite(distance);
        const estimates = estimateCommuteTimes(distance);
        return (
            <li className="home-distance-main" key={key}>
              <span>距離 {label}: <strong>{formatDistance(distance)}</strong></span>
            </li>
        );
      })}
    </ul>
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
            <h1>把選園問題拆成幾個能快速對焦的決策點</h1>
            <p>先釐清生活圈、錄取方式和時段需求，再談教學風格，討論會順很多。</p>
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
                <p>真正會天天影響生活的，通常是接送動線，不是簡章上的亮點。</p>
              </article>
              <article>
                <h3>班別分開看</h3>
                <p>2 歲專班和 3-5 歲班需求不同，缺額也常差很多，最好拆開看。</p>
              </article>
              <article>
                <h3>先看能不能上</h3>
                <p>先確認抽籤或報名方式，避免把時間花在根本進不去的選項。</p>
              </article>
            </div>
          </InfoBlock>

          <InfoBlock title="公立、非營利、準公共怎麼看">
            <div className="guide-grid">
              <article>
                <h3>公立</h3>
                <p>便宜、穩定、校園完整，但通常名額少，時段安排要逐園確認。</p>
              </article>
              <article>
                <h3>非營利</h3>
                <p>平價、全年托育友善，也較常被比較師資穩定和延托品質。</p>
              </article>
              <article>
                <h3>準公共</h3>
                <p>報名彈性高，但園所差異大，除了月費還要看額外收費和師資流動。</p>
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
                <p>說話方式、等待孩子的耐心，往往比簡章更接近真實日常。</p>
              </article>
              <article>
                <h3>再看孩子是不是自在</h3>
                <p>孩子敢不敢移動、拿教材、開口問，能看出教室氛圍。</p>
              </article>
              <article>
                <h3>最後問細節</h3>
                <p>午睡、挑食、如廁、臨時生病，最能看出園方怎麼照顧孩子。</p>
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
              <p>先用來建立決策框架；實際收費、時段與招生仍以各園公告為準。</p>
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

function SourcesPage() {
  return (
    <>
      <Header />
      <main className="guide">
        <a className="back-link" href="#/">
          回清單
        </a>
        <section className="info-block">
          <h2>資料來源</h2>
          <div className="sources">
            <p>本專案幼兒園資料與相關資訊，主要參考以下來源彙整：</p>
            <div style={{ marginTop: '14px' }}>
              {sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default App;
