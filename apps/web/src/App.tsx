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

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
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
          <span className="results-count">
            {loading ? "LOADING" : `${remainingProfiles.length} PROFILES`}
          </span>
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

        {!loading && !error && remainingProfiles.length > 0 && (
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
