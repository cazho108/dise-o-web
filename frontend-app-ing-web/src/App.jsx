import { useEffect, useState } from 'react'
import api from './api/axios'
import './App.css'

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

const formatDate = (date) =>
  new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00`))

function App() {
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [table, setTable] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const [teamsResponse, matchesResponse, tableResponse] = await Promise.all([
          api.get('/equipos'),
          api.get('/partidos'),
          api.get('/tabla'),
        ])

        if (isMounted) {
          setTeams(teamsResponse.data)
          setMatches(matchesResponse.data)
          setTable(tableResponse.data)
        }
      } catch {
        if (isMounted) {
          setError('No pudimos conectar con la API. Comprueba que el backend esté ejecutándose en localhost:3000.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadDashboard()
    return () => {
      isMounted = false
    }
  }, [refreshKey])

  const finishedMatches = matches.filter((match) => match.estado === 'finalizado').length
  const nextMatch = matches.find((match) => match.estado === 'programado')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#inicio" aria-label="Cancha, inicio">
          <span className="brand-mark">C</span>
          <span>cancha<span className="brand-dot">.</span></span>
        </a>

        <span className="nav-caption">MENÚ PRINCIPAL</span>
        <nav className="side-nav" aria-label="Navegación principal">
          <a className="nav-item active" href="#inicio"><span className="nav-icon">◫</span>Resumen</a>
          <a className="nav-item" href="#partidos"><span className="nav-icon">◷</span>Partidos</a>
          <a className="nav-item" href="#tabla"><span className="nav-icon">▤</span>Tabla</a>
          <a className="nav-item" href="#equipos"><span className="nav-icon">♧</span>Equipos</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="league-mini-mark">⚽</div>
          <div>
            <strong>Liga de barrio</strong>
            <span>Temporada 2026</span>
          </div>
          <span className="mini-chevron">⌄</span>
        </div>
      </aside>

      <main className="main-content" id="inicio">
        <header className="topbar">
          <div className="breadcrumb">Competiciones <span>/</span> <strong>Liga de barrio</strong></div>
          <div className="topbar-right">
            <span className="season-pill"><span /> TEMPORADA 2026</span>
            <div className="avatar" aria-label="Perfil de usuario">JD</div>
          </div>
        </header>

        <div className="dashboard">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">LUNES, 5 DE OCTUBRE DE 2026</p>
              <h1>El fútbol nos une<span>.</span></h1>
              <p className="welcome-copy">Toda la emoción de tu liga, en un solo lugar.</p>
            </div>
            <button className="refresh-button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
              <span className={loading ? 'refresh-icon spinning' : 'refresh-icon'}>↻</span>
              Actualizar
            </button>
          </section>

          {error && (
            <div className="error-banner" role="alert">
              <span>!</span>
              <p>{error}</p>
              <button onClick={() => setRefreshKey((key) => key + 1)}>Reintentar</button>
            </div>
          )}

          <section className="hero-card" aria-label="Presentación de la liga">
            <div className="hero-copy">
              <span className="hero-tag"><span /> LA PASIÓN ESTÁ DE VUELTA</span>
              <h2>Una liga.<br />Un mismo sueño.</h2>
              <p>La temporada ya se juega. Sigue cada resultado y alienta a tu equipo.</p>
              <a className="hero-link" href="#partidos">Explorar partidos <span>↗</span></a>
            </div>
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-ball" aria-hidden="true">⚽</div>
            <div className="hero-spark spark-one">✳</div>
            <div className="hero-spark spark-two">✦</div>
            <div className="hero-label">JUEGA CON EL CORAZÓN</div>
          </section>

          <section className="stat-grid" aria-label="Resumen de la liga">
            <article className="stat-card">
              <div className="stat-icon teams-icon">♧</div>
              <div><span className="stat-label">Equipos</span><strong>{loading ? '—' : teams.length.toString().padStart(2, '0')}</strong><span className="stat-note">en competencia</span></div>
              <span className="stat-decoration">01</span>
            </article>
            <article className="stat-card">
              <div className="stat-icon matches-icon">◷</div>
              <div><span className="stat-label">Partidos jugados</span><strong>{loading ? '—' : finishedMatches.toString().padStart(2, '0')}</strong><span className="stat-note">esta temporada</span></div>
              <span className="stat-decoration">02</span>
            </article>
            <article className="stat-card next-stat">
              <div className="stat-icon next-icon">↗</div>
              <div><span className="stat-label">Próxima jornada</span><strong>{nextMatch ? formatDate(nextMatch.fecha) : 'Por definir'}</strong><span className="stat-note">{nextMatch ? `${nextMatch.local} vs. ${nextMatch.visitante}` : 'Mantente al tanto'}</span></div>
              <span className="stat-decoration">03</span>
            </article>
          </section>

          <div className="content-grid">
            <section className="panel matches-panel" id="partidos">
              <div className="panel-heading">
                <div><span className="section-kicker">EN LA CANCHA</span><h2>Partidos</h2></div>
                <a className="text-link" href="#partidos">Ver todos <span>→</span></a>
              </div>
              <div className="match-list">
                {loading ? (
                  <p className="empty-state">Cargando partidos...</p>
                ) : matches.length === 0 ? (
                  <p className="empty-state">Aún no hay partidos. ¡Pronto habrá novedades!</p>
                ) : matches.slice(0, 4).map((match) => (
                  <article className="match-row" key={match.id}>
                    <div className="match-team home-team">
                      <span className="team-crest crest-green">{getInitials(match.local)}</span>
                      <span>{match.local}</span>
                    </div>
                    <div className="match-center">
                      {match.estado === 'finalizado' ? (
                        <>
                          <strong className="score">{match.golesLocal}<i>:</i>{match.golesVisitante}</strong>
                          <span className="match-status played">FINAL</span>
                        </>
                      ) : (
                        <>
                          <strong className="versus">VS</strong>
                          <span className="match-status upcoming">{formatDate(match.fecha)}</span>
                        </>
                      )}
                    </div>
                    <div className="match-team away-team">
                      <span>{match.visitante}</span>
                      <span className="team-crest crest-orange">{getInitials(match.visitante)}</span>
                    </div>
                  </article>
                ))}
              </div>
              <a className="panel-footer-link" href="#partidos">Calendario de la liga <span>↗</span></a>
            </section>

            <section className="panel standings-panel" id="tabla">
              <div className="panel-heading">
                <div><span className="section-kicker">TEMPORADA 2026</span><h2>Tabla de posiciones</h2></div>
                <span className="table-trophy">♛</span>
              </div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>DG</th><th>PTS</th></tr></thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" className="empty-state">Cargando tabla...</td></tr>
                    ) : table.map((row, index) => (
                      <tr key={row.equipoId} className={index === 0 ? 'leader-row' : ''}>
                        <td><span className={index === 0 ? 'rank rank-first' : 'rank'}>{String(index + 1).padStart(2, '0')}</span></td>
                        <td><span className={index === 0 ? 'table-crest crest-green' : 'table-crest'}>{getInitials(row.equipo)}</span><strong className="table-team-name">{row.equipo}</strong></td>
                        <td>{row.partidosJugados}</td>
                        <td className={row.golesFavor - row.golesContra > 0 ? 'positive-difference' : ''}>{row.golesFavor - row.golesContra > 0 ? '+' : ''}{row.golesFavor - row.golesContra}</td>
                        <td><strong className="points">{row.puntos}</strong></td>
                      </tr>
                    ))}
                    {!loading && table.length === 0 && <tr><td colSpan="5" className="empty-state">No hay datos disponibles.</td></tr>}
                  </tbody>
                </table>
              </div>
              <a className="panel-footer-link" href="#tabla">Ver tabla completa <span>↗</span></a>
            </section>
          </div>

          <section className="teams-strip" id="equipos">
            <div className="teams-strip-heading">
              <div><span className="section-kicker">LOS PROTAGONISTAS</span><h2>Equipos de la liga</h2></div>
              <span>{loading ? '—' : `${teams.length} EQUIPOS`}</span>
            </div>
            <div className="team-chips">
              {loading ? <p className="empty-state">Cargando equipos...</p> : teams.map((team, index) => (
                <div className="team-chip" key={team.id}>
                  <span className={`chip-crest chip-color-${index % 4}`}>{getInitials(team.nombre)}</span>
                  <span><strong>{team.nombre}</strong><small>{team.ciudad}</small></span>
                  <span className="chip-arrow">↗</span>
                </div>
              ))}
              {!loading && teams.length === 0 && <p className="empty-state">Aún no hay equipos registrados.</p>}
            </div>
          </section>

          <footer className="page-footer">
            <span>HECHO PARA VIVIR EL FÚTBOL <span className="footer-ball">⚽</span></span>
            <span>LIGA DE BARRIO · 2026</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
