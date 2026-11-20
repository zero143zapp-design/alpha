import { useEffect, useState } from "react";

type Profile = {
  id: string;
  name: string;
  age: number;
  city: string;
  tagline: string;
  interests: string[];
  photoUrl: string;
  photoNote: string;
};

type ProfileResponse = {
  mode: "demo";
  profiles: Profile[];
};

type Decision = "like" | "pass";
type ViewMode = "list" | "map" | "interests";
type PrivateFilterId = "shared-hobby" | "smoking" | "kink";

const privateFilterOptions: { id: PrivateFilterId; label: string }[] = [
  { id: "shared-hobby", label: "Shared hobby" },
  { id: "smoking", label: "Smoking" },
  { id: "kink", label: "Kink compatibility" },
];

function getMapPosition(city: string) {
  if (city.includes("Brooklyn")) return { left: "61%", top: "69%" };
  if (city.includes("Queens")) return { left: "77%", top: "45%" };
  if (city.includes("Jersey City")) return { left: "34%", top: "53%" };
  return { left: "53%", top: "50%" };
}

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedMapProfileId, setSelectedMapProfileId] = useState<string | null>(null);
  const [selectedInterest, setSelectedInterest] = useState<{
    profileId: string;
    name: string;
  } | null>(null);
  const [privateFilters, setPrivateFilters] = useState<PrivateFilterId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await fetch("/api/profiles");
        if (!response.ok) {
          throw new Error(`Profile request failed (${response.status}).`);
        }

        const result = (await response.json()) as ProfileResponse;
        setProfiles(result.profiles);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load demo profiles."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadProfiles();
  }, []);

  const decide = (profileId: string, decision: Decision) => {
    setDecisions((current) => ({ ...current, [profileId]: decision }));
  };

  const remainingProfiles = profiles.filter(
    (profile) => !decisions[profile.id]
  );
  const selectedMapProfile =
    remainingProfiles.find((profile) => profile.id === selectedMapProfileId) ??
    remainingProfiles[0];
  const activeInterest = selectedInterest &&
    remainingProfiles.some((profile) => profile.id === selectedInterest.profileId)
    ? selectedInterest
    : null;
  const interestMapProfiles = privateFilters.length > 0 ? [] : remainingProfiles;

  const togglePrivateFilter = (filterId: PrivateFilterId) => {
    setPrivateFilters((current) =>
      current.includes(filterId)
        ? current.filter((item) => item !== filterId)
        : [...current, filterId]
    );
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Zephyr home">
          <span className="brand-mark" aria-hidden="true">
            z
          </span>
          zephyr
        </a>
        <nav aria-label="Main navigation">
          <a className="nav-link active" href="#discover" aria-current="page">
            Discover
          </a>
          <span className="nav-link muted" aria-disabled="true">
            Connections <span className="soon">SOON</span>
          </span>
        </nav>
        <div className="profile-menu" aria-label="Demo account">
          <span className="avatar-initial" aria-hidden="true">
            Y
          </span>
          <span className="demo-account">Your demo</span>
          <span className="chevron" aria-hidden="true">
            ⌄
          </span>
        </div>
      </header>

      <section className="demo-notice" aria-label="Demo notice">
        <span className="demo-dot" aria-hidden="true" />
        <p>
          <strong>Demo experience</strong>
          <span>
            Sample profiles and session-only choices. Privacy labels are
            illustrative.
          </span>
        </p>
        <span className="demo-label">NOT CONNECTED</span>
      </section>

      <section className="intro" id="discover">
        <div className="intro-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            A little more intentional
          </p>
          <h1>
            Meet someone
            <br />
            <span>who feels like you.</span>
          </h1>
          <p className="intro-text">
            Good connections begin with seeing the whole person. Take your
            time, stay curious, and let things unfold.
          </p>
        </div>
        <div className="location-chip">
          <span className="location-icon" aria-hidden="true">
            +
          </span>
          <span>
            <small>EXPLORING NEAR</small>
            Brooklyn, New York
          </span>
          <span className="chevron" aria-hidden="true">
            ⌄
          </span>
        </div>
      </section>

      <section className="discovery-section" aria-labelledby="discover-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A good place to start</p>
            <h2 id="discover-heading">People worth getting to know</h2>
          </div>
          <div className="section-tools">
            <span className="results-count">
              {loading ? "LOADING" : `${remainingProfiles.length} PROFILES`}
            </span>
            <div className="view-switch" role="group" aria-label="Profile view">
              <button
                className={viewMode === "list" ? "selected" : ""}
                type="button"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
              >
                <span aria-hidden="true">☷</span> List
              </button>
              <button
                className={viewMode === "map" ? "selected" : ""}
                type="button"
                aria-pressed={viewMode === "map"}
                onClick={() => setViewMode("map")}
              >
                <span aria-hidden="true">⌖</span> Map
              </button>
              <button
                className={viewMode === "interests" ? "selected" : ""}
                type="button"
                aria-pressed={viewMode === "interests"}
                onClick={() => setViewMode("interests")}
              >
                <span aria-hidden="true">✳</span> Mind map
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <p className="status-message" role="status">
            Finding your first introductions…
          </p>
        )}
        {!loading && error && (
          <div className="status-message error-message" role="alert">
            <strong>Profiles couldn’t load.</strong>
            <span>
              {error} Start the API and web app together with{" "}
              <code>npm run dev</code> from the project root.
            </span>
          </div>
        )}
        {!loading && !error && remainingProfiles.length === 0 && (
          <p className="status-message" role="status">
            You’ve seen everyone in this demo. Refresh to start over.
          </p>
        )}

        {!loading && !error && remainingProfiles.length > 0 && viewMode === "list" && (
          <div className="profile-grid">
            {remainingProfiles.map((profile, index) => (
              <article className="profile-card" key={profile.id}>
                <div className="photo-wrap">
                  <img
                    className="profile-photo"
                    src={profile.photoUrl}
                    alt={`${profile.name}, sample profile`}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  <span className="photo-count">
                    <span className="tiny-lock" aria-hidden="true">
                      ◈
                    </span>
                    {profile.photoNote}
                  </span>
                  <span className="profile-number">
                    0{index + 1} <span>/ 0{profiles.length}</span>
                  </span>
                </div>
                <div className="profile-content">
                  <div className="name-row">
                    <h3>
                      {profile.name}, {profile.age}
                    </h3>
                    <span className="online-dot" aria-label="Sample profile" />
                  </div>
                  <p className="profile-location">{profile.city}</p>
                  <p className="tagline">“{profile.tagline}”</p>
                  <div className="interest-list" aria-label="Interests">
                    {profile.interests.map((interest) => (
                      <span className="interest" key={interest}>
                        {interest}
                      </span>
                    ))}
                  </div>
                  <div className="card-actions">
                    <button
                      className="pass-button"
                      type="button"
                      onClick={() => decide(profile.id, "pass")}
                      aria-label={`Pass on ${profile.name}`}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                    <button
                      className="like-button"
                      type="button"
                      onClick={() => decide(profile.id, "like")}
                    >
                      <span aria-hidden="true">♡</span> Say hello
                    </button>
                  </div>
                  <p className="action-disclaimer">
                    Demo only · choices aren’t sent or saved
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && remainingProfiles.length > 0 && viewMode === "map" && (
          <div className="map-layout">
            <div>
              <div
                className="map-canvas"
                role="region"
                aria-label="Approximate city-level map of sample profiles"
              >
                <svg className="map-art" viewBox="0 0 900 520" aria-hidden="true">
                  <rect width="900" height="520" fill="#111925" />
                  <path
                    className="map-water"
                    d="M112 -20 C214 48 160 119 232 190 C288 247 197 335 273 540 L389 540 C322 425 385 347 323 270 C268 201 341 126 272 -20 Z"
                  />
                  <path
                    className="map-water"
                    d="M456 -20 C520 50 432 111 493 186 C545 248 454 332 535 540 L625 540 C551 409 620 334 558 248 C498 166 579 94 539 -20 Z"
                  />
                  <g className="map-roads">
                    <path d="M0 70 C144 98 231 44 354 80 S655 120 900 62" />
                    <path d="M0 154 C122 188 244 121 366 160 S665 199 900 141" />
                    <path d="M0 244 C119 274 244 211 375 245 S683 292 900 220" />
                    <path d="M0 344 C138 365 244 306 377 340 S687 385 900 315" />
                    <path d="M0 438 C132 459 254 407 378 432 S673 479 900 410" />
                    <path d="M48 0 C96 115 33 243 91 520" />
                    <path d="M366 0 C400 112 334 245 400 520" />
                    <path d="M671 0 C638 124 730 269 666 520" />
                    <path d="M816 0 C785 142 862 267 813 520" />
                  </g>
                  <g className="map-major-roads">
                    <path d="M16 290 C176 250 294 291 426 270 S711 255 884 190" />
                    <path d="M294 18 C338 138 267 218 335 326 S386 445 364 510" />
                    <path d="M612 30 C575 145 652 225 601 344 S624 454 648 509" />
                  </g>
                </svg>
                <span className="map-neighborhood jersey-label">Jersey City</span>
                <span className="map-neighborhood manhattan-label">Manhattan</span>
                <span className="map-neighborhood brooklyn-label">Brooklyn</span>
                <span className="map-neighborhood queens-label">Queens</span>
                <span className="map-neighborhood bronx-label">The Bronx</span>
                {remainingProfiles.map((profile) => {
                  const position = getMapPosition(profile.city);
                  const selected = selectedMapProfile?.id === profile.id;
                  return (
                    <button
                      className={`map-marker${selected ? " selected" : ""}`}
                      key={profile.id}
                      type="button"
                      style={position}
                      aria-label={`Show ${profile.name}, ${profile.age}, in ${profile.city}`}
                      aria-pressed={selected}
                      onClick={() => setSelectedMapProfileId(profile.id)}
                    >
                      <span className="map-marker-avatar">
                        <img src={profile.photoUrl} alt="" />
                      </span>
                      <span className="map-marker-name">{profile.name}</span>
                    </button>
                  );
                })}
                <span className="map-badge">APPROXIMATE AREAS</span>
              </div>
              <p className="map-caption">
                Sample profiles are shown by city only. Exact or live locations
                aren’t displayed.
              </p>
            </div>

            {selectedMapProfile && (
              <aside className="map-profile-panel" aria-live="polite">
                <p className="map-panel-eyebrow">PROFILE IN THIS AREA</p>
                <img
                  className="map-profile-photo"
                  src={selectedMapProfile.photoUrl}
                  alt={`${selectedMapProfile.name}, sample profile`}
                />
                <h3>
                  {selectedMapProfile.name}, {selectedMapProfile.age}
                </h3>
                <p className="profile-location">{selectedMapProfile.city}</p>
                <p className="map-profile-tagline">“{selectedMapProfile.tagline}”</p>
                <div className="card-actions">
                  <button
                    className="pass-button"
                    type="button"
                    onClick={() => decide(selectedMapProfile.id, "pass")}
                    aria-label={`Pass on ${selectedMapProfile.name}`}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                  <button
                    className="like-button"
                    type="button"
                    onClick={() => decide(selectedMapProfile.id, "like")}
                  >
                    <span aria-hidden="true">♡</span> Say hello
                  </button>
                </div>
                <p className="action-disclaimer">
                  Demo only · choices aren’t sent or saved
                </p>
              </aside>
            )}
          </div>
        )}

        {!loading && !error && remainingProfiles.length > 0 && viewMode === "interests" && (
          <div className="interest-map-view" role="region" aria-label="Profile interest mind map">
            <div className="interest-map-heading">
              <div>
                <p className="eyebrow">A little more to connect on</p>
                <h3>People, ideas, and things they love</h3>
              </div>
              <p>Choose an interest node to focus on that profile.</p>
            </div>
            <div className="interest-map-grid">
              {interestMapProfiles.map((profile) => (
                <article className="interest-branch" key={profile.id}>
                  <div className="interest-person-node">
                    <img src={profile.photoUrl} alt="" />
                    <span>
                      <strong>{profile.name}, {profile.age}</strong>
                      <small>{profile.city}</small>
                    </span>
                  </div>
                  <span className="interest-connector" aria-hidden="true" />
                  <div className="interest-nodes" aria-label={`${profile.name}'s interests`}>
                    {profile.interests.map((interest) => {
                      const selected =
                        activeInterest?.profileId === profile.id &&
                        activeInterest.name === interest;
                      return (
                        <button
                          className={`interest-node${selected ? " selected" : ""}`}
                          key={interest}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedInterest({ profileId: profile.id, name: interest })}
                        >
                          <span className="interest-node-dot" aria-hidden="true" />
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
            <p className="interest-map-note" role="status">
              {privateFilters.length > 0
                ? "Private filters are active. No demo profiles match yet."
                : activeInterest
                ? `${activeInterest.name} is one of ${remainingProfiles.find((profile) => profile.id === activeInterest.profileId)?.name ?? "this profile"}’s interests.`
                : "The current demo has nine interests across three profiles. Select a node to explore it."}
            </p>
            <details className="private-matching">
              <summary>
                <span>Discreet matching</span>
                <span className="private-only-label">Not shown on profiles</span>
              </summary>
              <div className="private-matching-content">
                <p>
                  Choose private compatibility filters. They never appear on
                  public profile cards.
                </p>
                <div className="private-filter-list">
                  {privateFilterOptions.map((filter) => (
                    <label className="private-filter" key={filter.id}>
                      <input
                        type="checkbox"
                        checked={privateFilters.includes(filter.id)}
                        onChange={() => togglePrivateFilter(filter.id)}
                      />
                      <span>{filter.label}</span>
                    </label>
                  ))}
                </div>
                <p className="private-demo-note" role="status">
                  {privateFilters.length > 0
                    ? "No demo profiles have opted into private matching yet, so no profiles are shown."
                    : "Private matching is a visual demo. No preferences are saved, sent, or included in profile data."}
                </p>
              </div>
            </details>
          </div>
        )}
      </section>

      <footer className="safety-note">
        <span className="safety-icon" aria-hidden="true">
          ✓
        </span>
        <span>
          <strong>Your comfort comes first.</strong> Take it at your own pace.
          The privacy controls shown here are a visual concept, not access
          controls.
        </span>
      </footer>
    </main>
  );
}

export default App;
