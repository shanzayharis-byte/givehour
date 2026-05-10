import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const CAUSES       = ['Education', 'Environment', 'Animals', 'Food Security', 'Health', 'Housing', 'Arts', 'Seniors']
const US_REGIONS   = ['Bay Area, CA', 'Los Angeles, CA', 'San Diego, CA', 'New York, NY', 'Chicago, IL', 'Houston, TX', 'Seattle, WA', 'Austin, TX', 'Boston, MA', 'Remote / Online']
const DAYS         = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS_OPTS   = ['1–3 hrs/week', '3–5 hrs/week', '5–10 hrs/week', '10+ hrs/week']
const GRADES       = ['8th', '9th', '10th', '11th', '12th']

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 16 }}>{subtitle}</div>}
        {children}
        <button onClick={onClose} style={{ width: '100%', padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', color: T.text, marginTop: 12 }}>Close</button>
      </div>
    </div>
  )
}

export default function Profile({ user, onSignOut }) {
  const [totalHours, setTotalHours]   = useState(0)
  const [orgCount, setOrgCount]       = useState(0)
  const [isDesktop, setIsDesktop]     = useState(window.innerWidth >= 1024)
  const [loading, setLoading]         = useState(true)
  const [interests, setInterests]     = useState(user?.interests || [])
  const [prefCause, setPrefCause]     = useState(user?.preferred_cause || '')
  const [region, setRegion]           = useState(user?.region || '')

  // school info
  const [schoolName, setSchoolName]   = useState(user?.school_name || '')
  const [grade, setGrade]             = useState(user?.grade || '')

  // availability
  const [availDays, setAvailDays]     = useState(user?.availability_days || [])
  const [hoursPerWeek, setHoursPerWeek] = useState(user?.hours_per_week || '')

  // notifications
  const [notifMatches, setNotifMatches]     = useState(user?.notif_new_matches ?? true)
  const [notifReminders, setNotifReminders] = useState(user?.notif_reminders ?? true)

  // modals
  const [showCause, setShowCause]       = useState(false)
  const [showRegion, setShowRegion]     = useState(false)
  const [showSchool, setShowSchool]     = useState(false)
  const [showAvail, setShowAvail]       = useState(false)
  const [showNotif, setShowNotif]       = useState(false)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('hours_log').select('hours, org').eq('user_id', user?.id)
        if (data) {
          setTotalHours(data.reduce((s, r) => s + (parseFloat(r.hours) || 0), 0))
          setOrgCount(new Set(data.map(r => r.org)).size)
        }
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [user])

  const save = async (fields) => {
    await supabase.from('users').update(fields).eq('id', user.id)
  }

  const saveCause = async (cause) => {
    const newInterests = interests.includes(cause) ? interests : [...interests, cause]
    await save({ preferred_cause: cause, interests: newInterests })
    setPrefCause(cause)
    setInterests(newInterests)
    setShowCause(false)
  }

  const removeInterest = async (interest) => {
    const newInterests = interests.filter(i => i !== interest)
    await save({ interests: newInterests, ...(prefCause === interest ? { preferred_cause: null } : {}) })
    setInterests(newInterests)
    if (prefCause === interest) setPrefCause('')
  }

  const saveRegion = async (r) => {
    await save({ region: r })
    setRegion(r)
    setShowRegion(false)
  }

  const saveSchool = async () => {
    await save({ school_name: schoolName, grade })
    setShowSchool(false)
  }

  const toggleDay = (day) => {
    setAvailDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const saveAvail = async () => {
    await save({ availability_days: availDays, hours_per_week: hoursPerWeek })
    setShowAvail(false)
  }

  const saveNotif = async () => {
    await save({ notif_new_matches: notifMatches, notif_reminders: notifReminders })
    setShowNotif(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onSignOut()
  }

  const initial = (user?.name || 'U')[0].toUpperCase()

  const profileCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.primaryLight, color: T.primary, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(24,160,80,0.3)', flexShrink: 0 }}>{initial}</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{user?.name || 'Teen'}</div>
          <div style={{ fontSize: 12, color: T.textSub, marginTop: 2 }}>{grade || user?.grade || ''}{(grade || user?.grade) && (region || user?.zip) ? ' · ' : ''}{region || user?.zip || ''}</div>
          <div style={{ fontSize: 12, color: T.primary, fontWeight: 700, marginTop: 2 }}>{totalHours} hours · {orgCount} orgs helped</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
        <div>
          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 2 }}>Region</div>
          <div style={{ fontSize: 13, color: region ? T.text : T.textMuted }}>{region || 'Not set — affects your matches'}</div>
        </div>
        <button onClick={() => setShowRegion(true)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.primaryLight, color: T.primary, border: 'none', cursor: 'pointer', fontWeight: 600 }}>{region ? 'Change' : 'Set'}</button>
      </div>
    </div>
  )

  const interestsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>My interests</div>
        {prefCause && <span style={{ fontSize: 11, color: T.textMuted }}>⭐ {prefCause} is your top match</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {interests.map(interest => {
          const c = CAUSE[interest] || { bg: T.primaryLight, text: T.primary }
          return (
            <span key={interest} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: c.bg, color: c.text, fontWeight: 500, border: interest === prefCause ? `1.5px solid ${c.text}` : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              {interest === prefCause && '⭐'}{interest}
              <span onClick={() => removeInterest(interest)} style={{ cursor: 'pointer', opacity: 0.6, fontSize: 14, lineHeight: 1 }}>×</span>
            </span>
          )
        })}
        <button onClick={() => setShowCause(true)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, background: T.bg, border: `1.5px dashed rgba(24,160,80,0.6)`, color: T.primary, cursor: 'pointer', fontWeight: 500 }}>+ Add</button>
      </div>
    </div>
  )

  const settingsCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
      {[
        { label: 'Notification settings', action: () => setShowNotif(true) },
        { label: 'Availability', action: () => setShowAvail(true) },
        { label: 'School information', action: () => setShowSchool(true) },
        { label: 'Sign out', color: T.danger, action: handleSignOut },
      ].map(({ label, color, action }, i, arr) => (
        <button key={label} onClick={action} style={{ width: '100%', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#fff', border: 'none', borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none', textAlign: 'left' }}>
          <span style={{ fontSize: 14, color: color || T.text, fontWeight: label === 'Sign out' ? 500 : 400 }}>{label}</span>
          {label !== 'Sign out' && <span style={{ color: T.textMuted, fontSize: 18 }}>›</span>}
        </button>
      ))}
    </div>
  )

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>Profile</div>
      </div>
      <div style={{ padding: isDesktop ? '32px 40px' : '20px' }}>
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>{profileCard}{interestsCard}</div>
            <div>{settingsCard}</div>
          </div>
        ) : (
          <>{profileCard}{interestsCard}{settingsCard}</>
        )}
      </div>

      {/* cause picker */}
      {showCause && (
        <Modal title="Pick a cause" subtitle="Your top pick boosts those listings in your feed" onClose={() => setShowCause(false)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
            {CAUSES.map(cause => {
              const c = CAUSE[cause] || { bg: T.primaryLight, text: T.primary }
              return (
                <button key={cause} onClick={() => saveCause(cause)} style={{ fontSize: 13, padding: '8px 16px', borderRadius: 20, background: prefCause === cause ? c.text : c.bg, color: prefCause === cause ? '#fff' : c.text, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {prefCause === cause ? '⭐ ' : ''}{cause}
                </button>
              )
            })}
          </div>
        </Modal>
      )}

      {/* region picker */}
      {showRegion && (
        <Modal title="Your region" subtitle="Used to surface nearby opportunities in your feed" onClose={() => setShowRegion(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
            {US_REGIONS.map(r => (
              <button key={r} onClick={() => saveRegion(r)} style={{ padding: '12px 16px', borderRadius: 10, background: region === r ? T.primaryLight : T.bg, color: region === r ? T.primary : T.text, border: `1px solid ${region === r ? T.primary : T.border}`, cursor: 'pointer', fontSize: 13, fontWeight: region === r ? 600 : 400, textAlign: 'left' }}>
                {region === r ? '✓ ' : ''}{r}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* school info */}
      {showSchool && (
        <Modal title="School information" onClose={() => setShowSchool(false)}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>School name</div>
            <input value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Mission High School" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Grade</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {GRADES.map(g => (
                <button key={g} onClick={() => setGrade(g)} style={{ padding: '8px 16px', borderRadius: 20, background: grade === g ? T.primary : T.bg, color: grade === g ? '#fff' : T.text, border: `1px solid ${grade === g ? T.primary : T.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{g}</button>
              ))}
            </div>
          </div>
          <button onClick={saveSchool} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Save</button>
        </Modal>
      )}

      {/* availability */}
      {showAvail && (
        <Modal title="Your availability" subtitle="Helps us recommend opportunities that fit your schedule" onClose={() => setShowAvail(false)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>Days available</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {DAYS.map(day => {
                const on = availDays.includes(day)
                return (
                  <button key={day} onClick={() => toggleDay(day)} style={{ padding: '7px 14px', borderRadius: 20, background: on ? T.primaryLight : T.bg, color: on ? T.primary : T.text, border: `1.5px solid ${on ? T.primary : T.border}`, cursor: 'pointer', fontSize: 12, fontWeight: on ? 600 : 400 }}>{day.slice(0, 3)}</button>
                )
              })}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>Hours per week</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {HOURS_OPTS.map(h => (
                <button key={h} onClick={() => setHoursPerWeek(h)} style={{ padding: '10px 14px', borderRadius: 8, background: hoursPerWeek === h ? T.primaryLight : T.bg, color: hoursPerWeek === h ? T.primary : T.text, border: `1px solid ${hoursPerWeek === h ? T.primary : T.border}`, cursor: 'pointer', fontSize: 13, fontWeight: hoursPerWeek === h ? 600 : 400, textAlign: 'left' }}>{hoursPerWeek === h ? '✓ ' : ''}{h}</button>
              ))}
            </div>
          </div>
          <button onClick={saveAvail} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Save</button>
        </Modal>
      )}

      {/* notifications */}
      {showNotif && (
        <Modal title="Notification settings" onClose={() => setShowNotif(false)}>
          {[
            { label: 'New match alerts', sub: 'When new listings match your profile', val: notifMatches, set: setNotifMatches },
            { label: 'Reminders', sub: 'Nudges to log hours after an opportunity', val: notifReminders, set: setNotifReminders },
          ].map(({ label, sub, val, set }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{sub}</div>
              </div>
              <div onClick={() => set(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, background: val ? T.primary : '#ccc', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: val ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
            </div>
          ))}
          <button onClick={saveNotif} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', marginTop: 16 }}>Save</button>
        </Modal>
      )}
    </div>
  )
}
