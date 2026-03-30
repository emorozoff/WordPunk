import { FC, useEffect, useState, useRef } from 'react';
import { getAllProgress, getActivity, countCards } from '../db';
import type { DayActivity } from '../types';

interface Props {
  onBack: () => void;
}

const LEVEL_COLORS = ['#555', '#444488', '#3355aa', '#00aa55', '#00ff88', '#ffaa00'];
const LEVEL_NAMES  = ['Новые', 'Lvl 1', 'Lvl 2', 'Lvl 3', 'Lvl 4', 'Lvl 5 ★'];

const SWIPE_EDGE = 30;    // px from left edge to start gesture
const SWIPE_MIN  = 80;    // min horizontal distance to trigger back

const StatsScreen: FC<Props> = ({ onBack }) => {
  const [known, setKnown] = useState(0);
  const [total, setTotal] = useState(0);
  const [dist, setDist] = useState<Record<number, number>>({ 0:0,1:0,2:0,3:0,4:0,5:0 });
  const [activity, setActivity] = useState<DayActivity[]>([]);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const edgeSwipe = useRef(false);

  useEffect(() => {
    const load = async () => {
      const [prog, act, cnt] = await Promise.all([
        getAllProgress(),
        getActivity(90),
        countCards(),
      ]);
      setTotal(cnt);
      setKnown(prog.filter(p => p.level >= 3).length);
      const d: Record<number, number> = {0:0,1:0,2:0,3:0,4:0,5:0};
      for (const p of prog) d[p.level] = (d[p.level] ?? 0) + 1;
      setDist(d);
      setActivity(act);
    };
    load();
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
    touchStartY.current = e.touches[0]!.clientY;
    edgeSwipe.current = touchStartX.current <= SWIPE_EDGE;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!edgeSwipe.current) return;
    const dx = e.changedTouches[0]!.clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0]!.clientY - touchStartY.current);
    if (dx > SWIPE_MIN && dy < 80) {
      onBack();
    }
  };

  // Build 90-day grid
  const today = new Date();
  const cells: { date: string; count: number }[] = [];
  const actMap = new Map(activity.map(a => [a.date, a.count]));
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0]!;
    cells.push({ date: dateStr, count: actMap.get(dateStr) ?? 0 });
  }

  const maxDist = Math.max(...Object.values(dist), 1);

  return (
    <div
      className="stats-screen"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="stats-header">СТАТИСТИКА_</div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-number" style={{ color: 'var(--accent-green)' }}>{known}</div>
          <div className="stat-label">ЗНАЮ слов</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{total}</div>
          <div className="stat-label">ВСЕГО слов</div>
        </div>
      </div>

      <div className="stats-section-title">РАСПРЕДЕЛЕНИЕ ПО УРОВНЯМ</div>
      <div className="level-dist" style={{ marginBottom: 24 }}>
        {([0,1,2,3,4,5] as const).map(lvl => (
          <div key={lvl} className="level-dist-row">
            <span className="level-dist-label">{LEVEL_NAMES[lvl]}</span>
            <div className="level-dist-bar-bg">
              <div
                className="level-dist-bar-fill"
                style={{
                  width: `${(dist[lvl] ?? 0) / maxDist * 100}%`,
                  background: LEVEL_COLORS[lvl],
                }}
              />
            </div>
            <span className="level-dist-count">{dist[lvl] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="stats-section-title">АКТИВНОСТЬ (90 дней)</div>
      <div className="activity-grid">
        {cells.map(cell => {
          let cls = 'activity-cell';
          if (cell.count > 0)  cls += ' active-1';
          if (cell.count > 5)  cls += ' active-2';
          if (cell.count > 15) cls += ' active-3';
          if (cell.count > 30) cls += ' active-4';
          return <div key={cell.date} className={cls} title={`${cell.date}: ${cell.count}`} />;
        })}
      </div>

      <div className="stats-counter-info">
        <div className="stats-section-title">КАК СЧИТАЕТСЯ СЧЁТЧИК</div>
        <p>Не заморачивайся — алгоритм сам всё считает.</p>
        <p>Каждое слово имеет свой вес: чем лучше знаешь, тем больше оно добавляет в счётчик. Новое слово — маленький вклад. Повторил через день, через неделю, через месяц — вклад растёт.</p>
        <p>Просто отвечай на карточки, а цифра будет расти сама.</p>
      </div>

      <div className="stats-back-area">
        <button className="stats-back-btn" onClick={onBack}>← назад</button>
      </div>
    </div>
  );
};

export default StatsScreen;
