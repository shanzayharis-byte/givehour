import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { T, CAUSE } from '../lib/theme'

const MOCK = [{ cause: 'Housing', hours: 12 }, { cause: 'Education', hours: 8 }, { cause: 'Food Security', hours: 6 }]

export default function Impact({ user }) {
  const [totalHours, setTotalHours] = useState(0)
  const [byCause, setByCause] = useState([])
  const [streakDays, setStreakDays] = useState(0)
  const [oppCount, setOppCount] = useState(0)
  const [showLetter, setShowLetter] = useState(false)
  const [letter, setLetter] = useState('')
  const [letterLoading, setLetterLoading] = useState(false)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handle = () => setIsDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data: stats } = await supabase.from('impact_stats').select('*').eq('user_id', user?.id).maybeSingle()
        if (stats) {
          setTotalHours(parseFloat(stats.total_hours) || 0)
          setStreakDays(stats.streak_days || 0)
          setOppCount(stats.opportunities_count || 0)
          const causes = stats.causes_helped || []
          // distribute hours evenly across causes for display
          const hoursEach = causes.length > 0 ? Math.round((parseFloat(stats.total_hours) || 0) / causes.length * 10) / 10 : 0
          setByCause(causes.map(cause => ({ cause, hours: hoursEach })))
        } else {
          setTotalHours(0)
          setByCause([])
        }
      } catch (e) {
        setTotalHours(26)
        setByCause(MOCK)
      }
      setLoading(false)
    }
    load()
  }, [user])

  const generateLetter = async () => {
    setLetterLoading(true)
    setShowLetter(true)
    try {
      const topCauses = byCause.slice(0, 3).map(r => r.cause).join(', ')
      const { data: orgsData } = await supabase.from('hours_log').select('org').eq('user_id', user?.id)
      const orgs = [...new Set((orgsData || []).map(r => r.org))].join(', ') || 'various organizations'
      const key = import.meta.env.VITE_OPENAI_API_KEY
      if (!key) {
        setLetter(`Dear Admissions Committee,\n\nI am writing to confirm that ${user?.name || 'this student'} has completed ${totalHours} hours of volunteer service through the Give Hour platform.\n\nTheir dedication to causes including ${topCauses} demonstrates exceptional commitment to community service. They have contributed their time and energy to ${orgs}.\n\nWe are proud to recognize their service and recommend them highly.\n\nSincerely,\nGive Hour Platform`)
        setLetterLoading(false)
        return
      }
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: `Write a concise community service letter for ${user?.name || 'this student'}, a high school student who has completed ${totalHours} hours of volunteer work through Give Hour. Their top causes are ${topCauses}. They have worked with ${orgs}. Write it as if from the Give Hour platform. Keep it under 200 words.` }],
        }),
      })
      const json = await res.json()
      setLetter(json.choices?.[0]?.message?.content || 'Could not generate letter.')
    } catch (e) {
      setLetter('Could not generate letter at this time.')
    }
    setLetterLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 16, color: T.textMuted }}>Loading...</div>

  const heroCard = (
    <div style={{ background: 'linear-gradient(135deg, #18A050, #0E7A3C)', borderRadius: 16, padding: 24, marginBottom: 14, textAlign: 'center', boxShadow: '0 4px 14px rgba(24,160,80,0.25)' }}>
      <div style={{ fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{totalHours}</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 }}>total volunteer hours</div>
      <div style={{ marginTop: 10, display: 'inline-block', background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#fff', fontWeight: 700 }}>Top 12% of Give Hour teens 🏆</div>
    </div>
  )

  const causeCard = (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Hours by cause</div>
      {byCause.map(r => {
        const c = CAUSE[r.cause] || { bg: '#F2F2F2', text: '#666' }
        const pct = totalHours > 0 ? (r.hours / totalHours) * 100 : 0
        return (
          <div key={r.cause} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.cause}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{r.hours}h</span>
            </div>
            <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: c.text, borderRadius: 4 }} />
            </div>
          </div>
        )
      })}
    </div>
  )

  const letterCard = (
    <div style={{ border: `1.5px solid rgba(24,160,80,0.4)`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
        <div style={{ fontSize: 28 }}>🎓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 }}>College letter generator</div>
          <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6, marginBottom: 12 }}>Generate a personalized community service letter for your college applications based on your Give Hour activity.</div>
          <button onClick={generateLetter} style={{ width: '100%', padding: 12, background: T.primary, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Generate letter →</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '14px 20px' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: T.text }}>My Impact</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>Your volunteer story so far</div>
      </div>
      <div style={{ padding: isDesktop ? '32px 40px' : '16px 20px' }}>
        {isDesktop ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
              {[[totalHours, 'Total Hours', T.primary], [byCause.length, 'Causes', T.accent], [streakDays, 'Day Streak', T.warning], [oppCount, 'Opportunities', '#5B1FA0']].map(([val, lbl, color]) => (
                <div key={lbl} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 22px' }}>
                  <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 4 }}>{lbl}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {causeCard}
              {letterCard}
            </div>
          </>
        ) : (
          <>{heroCard}{causeCard}{letterCard}</>
        )}
      </div>

      {showLetter && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 500, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>Your Community Service Letter</div>
            {letterLoading ? (
              <div style={{ fontSize: 14, color: T.textMuted }}>Generating your letter...</div>
            ) : (
              <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: T.text }}>{letter}</div>
            )}
            <button onClick={() => setShowLetter(false)} style={{ width: '100%', padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', marginTop: 16, color: T.text }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
