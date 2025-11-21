import React, { useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import {
  CheckCircle2,
  Gift,
  Loader2,
  Lock,
  LogOut,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './App.css';

// Replace these with your real Firebase keys from the Firebase Console
const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
  projectId: 'YOUR_FIREBASE_PROJECT_ID',
  storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_FIREBASE_SENDER_ID',
  appId: 'YOUR_FIREBASE_APP_ID',
};

const firebaseReady =
  Object.values(firebaseConfig).every(Boolean) &&
  !Object.values(firebaseConfig)
    .map((v) => `${v}`.toLowerCase())
    .some((v) => v.includes('your_'));

let db = null;
if (firebaseReady) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

const USERS = [
  {
    id: 'mom',
    name: 'Mom',
    pin: '1234',
    color: 'from-pink-500 to-rose-500',
    avatar: '🌸',
  },
  {
    id: 'dad',
    name: 'Dad',
    pin: '1234',
    color: 'from-indigo-500 to-blue-500',
    avatar: '🚀',
  },
  {
    id: 'student1',
    name: 'Explorer',
    pin: '1234',
    color: 'from-emerald-500 to-teal-500',
    avatar: '🧠',
  },
];

const MODULES = [
  {
    id: 'math-sprint',
    title: 'Speed Math Sprint',
    xp: 80,
    badge: 'Math',
    detail: 'Beat the 2-minute clock with 15/15 correct.',
  },
  {
    id: 'reading-quest',
    title: 'Reading Quest',
    xp: 70,
    badge: 'Reading',
    detail: 'Read a chapter aloud and share the best part.',
  },
  {
    id: 'science-lab',
    title: 'Kitchen Science',
    xp: 90,
    badge: 'Science',
    detail: 'Complete one mini-experiment and record a finding.',
  },
  {
    id: 'kindness',
    title: 'Kindness Mission',
    xp: 60,
    badge: 'Life',
    detail: 'Do 2 helpful things for someone else today.',
  },
];

const REWARDS = [
  { id: 'screen', title: '20 min Screen Time', cost: 120, sparkle: true },
  { id: 'treat', title: 'Snack Token', cost: 90 },
  { id: 'late', title: 'Stay Up +15 min', cost: 150 },
  { id: 'song', title: 'Pick the Music', cost: 60 },
];

const DEFAULT_PROFILE = {
  points: 220,
  completed: [],
  rewards: [],
  streak: 0,
  lastLogin: Date.now(),
};

const localProfileKey = (userId) => `homeschool-profile-${userId}`;

const getLocalProfile = (userId) => {
  try {
    const raw = localStorage.getItem(localProfileKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Local profile read failed', err);
    return null;
  }
};

const saveLocalProfile = (userId, profile) => {
  try {
    localStorage.setItem(localProfileKey(userId), JSON.stringify(profile));
  } catch (err) {
    console.error('Local profile save failed', err);
  }
};

const launchConfetti = (colors) =>
  confetti({
    particleCount: 110,
    spread: 70,
    startVelocity: 45,
    origin: { y: 0.7 },
    colors: colors || ['#22c55e', '#a855f7', '#38bdf8'],
    scalar: 1.05,
  });

function App() {
  const [status, setStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [pinEntry, setPinEntry] = useState('');
  const [activeUser, setActiveUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const rewardSound = useMemo(
    () =>
      new Audio(
        'https://cdn.pixabay.com/download/audio/2022/03/15/audio_58f099c8af.mp3?filename=coins-170061.mp3'
      ),
    []
  );

  const clickSound = useMemo(
    () =>
      new Audio(
        'https://cdn.pixabay.com/download/audio/2022/03/15/audio_6df13e96cc.mp3?filename=click-124467.mp3'
      ),
    []
  );

  useEffect(() => {
    rewardSound.volume = 0.55;
    clickSound.volume = 0.35;
  }, [rewardSound, clickSound]);

  const play = (audio) => {
    if (!soundEnabled || !audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (err) {
      console.warn('Audio play blocked', err);
    }
  };

  const persistProfile = async (user, data) => {
    if (!user) return;
    if (db) {
      const ref = doc(db, 'profiles', user.id);
      await setDoc(ref, data, { merge: true });
    } else {
      saveLocalProfile(user.id, data);
    }
  };

  const hydrateProfile = async (user) => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      if (db) {
        const ref = doc(db, 'profiles', user.id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, { ...DEFAULT_PROFILE, name: user.name });
          setProfile({ ...DEFAULT_PROFILE, name: user.name });
        } else {
          setProfile(snap.data());
        }
      } else {
        const cached = getLocalProfile(user.id);
        if (cached) {
          setProfile(cached);
        } else {
          saveLocalProfile(user.id, { ...DEFAULT_PROFILE, name: user.name });
          setProfile({ ...DEFAULT_PROFILE, name: user.name });
        }
      }
      setStatus(`Ready, ${user.name}!`);
    } catch (err) {
      console.error(err);
      setStatus('Could not load profile. Check Firebase config.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleLogin = async () => {
    if (!selectedUser) return;
    if (pinEntry !== selectedUser.pin) {
      setStatus('Wrong PIN. Try again.');
      play(clickSound);
      return;
    }
    setActiveUser(selectedUser);
    setPinEntry('');
    await hydrateProfile(selectedUser);
    launchConfetti();
    play(rewardSound);
  };

  const handleCompleteModule = async (module) => {
    if (!activeUser || !profile) return;
    if (profile.completed?.includes(module.id)) {
      setStatus('Already marked as done.');
      return;
    }
    const updated = {
      ...profile,
      points: (profile.points || 0) + module.xp,
      completed: [...(profile.completed || []), module.id],
      streak: (profile.streak || 0) + 1,
      lastEarned: Date.now(),
    };
    setProfile(updated);
    await persistProfile(activeUser, updated);
    setStatus(`+${module.xp} XP earned for ${module.title}!`);
    launchConfetti(['#22c55e', '#f59e0b', '#a855f7']);
    play(rewardSound);
  };

  const handleRewardPurchase = async (reward) => {
    if (!activeUser || !profile) return;
    if ((profile.points || 0) < reward.cost) {
      setStatus('Not enough points yet.');
      play(clickSound);
      return;
    }
    const updated = {
      ...profile,
      points: profile.points - reward.cost,
      rewards: [...(profile.rewards || []), { ...reward, at: Date.now() }],
    };
    setProfile(updated);
    await persistProfile(activeUser, updated);
    setStatus(`${reward.title} unlocked!`);
    launchConfetti(['#f472b6', '#38bdf8', '#facc15']);
    play(rewardSound);
  };

  const resetSession = () => {
    setActiveUser(null);
    setProfile(null);
    setSelectedUser(null);
    setPinEntry('');
  };

  const completedCount = profile?.completed?.length || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 bg-gradient-to-r from-sky-500/30 via-fuchsia-500/20 to-emerald-500/20 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-6 py-10 space-y-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/90">
                <ShieldCheck size={16} /> Security & Fun — v1.4
              </p>
              <h1 className="text-3xl font-semibold text-white md:text-4xl">
                Homeschool Missions Control
              </h1>
              <p className="max-w-2xl text-slate-300">
                Tap your badge, enter your PIN, and launch today&apos;s modules.
                Earn XP, unlock rewards, and celebrate wins with sound + confetti.
              </p>
              {!firebaseReady && (
                <p className="text-amber-300 text-sm">
                  Firebase keys are placeholders. Using local saves until you add real config.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSoundEnabled((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium backdrop-blur transition hover:border-white/30"
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                {soundEnabled ? 'Sound on' : 'Muted'}
              </button>
              {activeUser && (
                <button
                  onClick={resetSession}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-red-400/40 hover:text-red-200"
                >
                  <LogOut size={18} />
                  Switch user
                </button>
              )}
            </div>
          </header>

          {!activeUser && (
            <section className="grid gap-4 md:grid-cols-3">
              {USERS.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user);
                    setPinEntry('');
                    play(clickSound);
                  }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-lg transition hover:-translate-y-1 hover:border-white/30"
                >
                  <div
                    className={`absolute inset-0 opacity-70 bg-gradient-to-br ${user.color}`}
                  />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="text-3xl">{user.avatar}</div>
                      <h3 className="text-xl font-semibold text-white">{user.name}</h3>
                      <p className="text-sm text-slate-100/80">Private PIN protected</p>
                    </div>
                    <div className="rounded-xl bg-black/30 p-3 text-slate-100">
                      <Lock />
                    </div>
                  </div>
                </button>
              ))}
            </section>
          )}

          {selectedUser && !activeUser && (
            <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Verifying</p>
                  <h3 className="text-xl font-semibold text-white">{selectedUser.name}</h3>
                </div>
                <Unlock className="text-emerald-300" />
              </div>
              <div className="mt-4 flex gap-3">
                {[0, 1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    className="h-12 w-12 rounded-xl border border-white/15 bg-black/30 text-center text-2xl leading-[3rem] text-white"
                  >
                    {pinEntry[slot] ? '•' : ''}
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '←', 0, 'Go'].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      if (val === '←') {
                        setPinEntry((prev) => prev.slice(0, -1));
                        return;
                      }
                      if (val === 'Go') {
                        handleLogin();
                        return;
                      }
                      if (pinEntry.length < 4) setPinEntry((prev) => `${prev}${val}`);
                    }}
                    className="h-12 rounded-xl border border-white/10 bg-white/5 text-lg font-semibold text-white transition hover:border-white/30"
                  >
                    {val === 'Go' ? <Rocket size={18} className="inline-block" /> : val}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                <span>Enter the 4-digit PIN to unlock missions.</span>
                <button
                  onClick={handleLogin}
                  disabled={pinEntry.length !== 4}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck size={16} />
                  Unlock
                </button>
              </div>
            </section>
          )}

          {activeUser && (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/60 via-emerald-500/30 to-emerald-400/10 p-5 shadow-lg">
                  <p className="text-sm text-emerald-50/90">Points</p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-3xl font-semibold text-white">
                      {profile?.points ?? '—'}
                    </span>
                    <Sparkles className="text-emerald-50" />
                  </div>
                  <p className="text-xs text-emerald-50/80">
                    Earned by completing missions.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
                  <p className="text-sm text-slate-200">Completed</p>
                  <div className="mt-2 flex items-center gap-2 text-3xl font-semibold text-white">
                    {completedCount}
                    <CheckCircle2 className="text-sky-300" />
                  </div>
                  <p className="text-xs text-slate-300">Modules finished</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
                  <p className="text-sm text-slate-200">Streak</p>
                  <div className="mt-2 flex items-center gap-2 text-3xl font-semibold text-white">
                    {profile?.streak ?? 0}
                    <Trophy className="text-amber-300" />
                  </div>
                  <p className="text-xs text-slate-300">In-a-row wins</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
                  <p className="text-sm text-slate-200">Security</p>
                  <div className="mt-2 flex items-center gap-2 text-3xl font-semibold text-white">
                    <ShieldCheck className="text-emerald-300" />
                  </div>
                  <p className="text-xs text-slate-300">
                    PIN-locked, {firebaseReady ? 'synced to Firebase' : 'local mode'}
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Today&apos;s Missions</p>
                    <h2 className="text-xl font-semibold text-white">Earn XP + Rewards</h2>
                  </div>
                  {loadingProfile && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Loader2 size={16} className="animate-spin" />
                      Syncing...
                    </div>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {MODULES.map((module) => {
                    const done = profile?.completed?.includes(module.id);
                    return (
                      <div
                        key={module.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                              {module.badge}
                            </p>
                            <h3 className="text-lg font-semibold text-white">{module.title}</h3>
                            <p className="text-sm text-slate-300">{module.detail}</p>
                          </div>
                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                            +{module.xp} XP
                          </span>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-slate-200">
                            {done ? (
                              <>
                                <CheckCircle2 className="text-emerald-300" size={18} />
                                Done
                              </>
                            ) : (
                              <>
                                <Sparkles className="text-sky-300" size={18} />
                                Ready
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => handleCompleteModule(module)}
                            disabled={done}
                            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-sky-950 shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {done ? 'Completed' : 'Mark done'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Reward Shop</p>
                    <h2 className="text-xl font-semibold text-white">Spend points, spark joy</h2>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  {REWARDS.map((reward) => (
                    <div
                      key={reward.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{reward.title}</h3>
                          <p className="text-sm text-slate-300">{reward.cost} pts</p>
                        </div>
                        <Gift className="text-pink-200" />
                      </div>
                      <button
                        onClick={() => handleRewardPurchase(reward)}
                        className="mt-4 w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
                      >
                        Buy
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
                <div className="flex items-center gap-2 text-white">
                  <Trophy size={18} />
                  <h3 className="font-semibold">Unlocked Rewards</h3>
                </div>
                {profile?.rewards?.length ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {profile.rewards
                      .slice()
                      .reverse()
                      .map((reward, idx) => (
                        <div
                          key={`${reward.id}-${idx}`}
                          className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
                        >
                          <div className="flex items-center gap-2 text-slate-100">
                            <Sparkles className="text-amber-200" size={16} />
                            {reward.title}
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(reward.at || Date.now()).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-300">
                    No rewards yet — complete missions and cash in!
                  </p>
                )}
              </section>
            </div>
          )}

          <footer className="pt-4 text-xs text-slate-400">
            {status || 'Select a badge to begin.'}
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
