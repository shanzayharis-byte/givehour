import { useState } from 'react'
import { T, CAUSE } from '../lib/theme'

const CAUSES = ['Education','Environment','Animals','Food Security','Health','Housing','Arts','Seniors']
const CAUSE_EMOJI = { Education:'📚', Environment:'🌿', Animals:'🐾', 'Food Security':'🍎', Health:'❤️', Housing:'🏠', Arts:'🎨', Seniors:'🤝' }
const US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']

// shared filter modal — used on Feed, Explore (opportunities tab), and Explore (organizations tab)
// `sections` = array of which to show: 'cause', 'location', 'ageGroup', 'state'
export default function FilterModal({
  filters,
  onChange,
  onClose,
  isDesktop,
  causeCounts = {},
  sections = ['cause', 'location', 'ageGroup', 'state'],
  title = 'Filter opportunities',
}) {
  const [local, setLocal] = useState(filters)
  const set = (key, val) => setLocal(p => ({ ...p, [key]: val }))

  const has = (s) => sections.includes(s)
  const activeCount = [has('cause') && local.cause, has('ageGroup') && local.ageGroup, has('location') && local.remote, has('state') && local.state && local.state !== 'California'].filter(Boolean).length

  const clearAll = () => {
    const cleared = {}
    if (has('cause'))    cleared.cause    = ''
    if (has('ageGroup')) cleared.ageGroup = ''
    if (has('location')) cleared.remote   = false
    if (has('state'))    cleared.state    = 'California'
    setLocal(p => ({ ...p, ...cleared }))
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: isDesktop ? 20 : '20px 20px 0 0', width: '100%', maxWidth: isDesktop ? 480 : 520, maxHeight: '85vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={clearAll} style={{ fontSize: 12, color: T.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: T.bg, border: 'none', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMuted }}>×</button>
          </div>
        </div>

        {has('cause') && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Cause</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {CAUSES.map(c => {
                const cs = CAUSE[c] || { bg: T.primaryLight, text: T.primary }
                const active = local.cause === c
                const count = causeCounts[c] || 0
                const disabled = count === 0 && !active && Object.keys(causeCounts).length > 0
                return (
                  <button key={c} onClick={() => !disabled && set('cause', active ? '' : c)}
                    style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', border: `1.5px solid ${active ? cs.text : T.border}`, background: active ? cs.bg : '#fff', color: active ? cs.text : disabled ? T.textMuted : T.textSub, opacity: disabled ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {CAUSE_EMOJI[c]} {c}
                    {Object.keys(causeCounts).length > 0 && !disabled && <span style={{ fontSize: 10, fontWeight: 700, background: active ? cs.text : T.bg, color: active ? '#fff' : T.textMuted, borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{count}</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {has('location') && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Location</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={() => set('remote', !local.remote)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${local.remote ? T.primary : T.border}`, background: local.remote ? T.primaryLight : '#fff', color: local.remote ? T.primary : T.textSub }}>🌐 Remote only</button>
            </div>
          </>
        )}

        {has('ageGroup') && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Age group</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
              {[['All Ages','All Ages'],['Teens (13-17)','Teenager'],['Open','No age specific']].map(([key, lbl]) => (
                <button key={key} onClick={() => set('ageGroup', local.ageGroup === key ? '' : key)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${local.ageGroup === key ? T.primary : T.border}`, background: local.ageGroup === key ? T.primaryLight : '#fff', color: local.ageGroup === key ? T.primary : T.textSub }}>{lbl}</button>
              ))}
            </div>
          </>
        )}

        {has('state') && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>State</div>
            <select
              value={local.state || ''}
              onChange={e => set('state', e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${local.state ? T.primary : T.border}`, fontSize: 13, color: T.text, background: '#fff', marginBottom: 20, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              <option value=''>All states (+ remote)</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}

        <button onClick={() => { onChange(local); onClose() }} style={{ width: '100%', padding: 14, background: T.primary, border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
          {activeCount > 0 ? `Apply ${activeCount} filter${activeCount > 1 ? 's' : ''}` : 'Apply'}
        </button>
        <button onClick={onClose} style={{ width: '100%', padding: 12, background: 'none', border: 'none', fontSize: 13, color: T.textMuted, cursor: 'pointer', marginTop: 8 }}>Cancel</button>
      </div>
    </div>
  )
}
