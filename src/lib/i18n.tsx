import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Lang = 'en' | 'ar';

export const translations = {
  en: {
    // ── Nav ──────────────────────────────────────────────
    nav: {
      home:       'Home',
      myRoutes:   'My Routes',
      alerts:     'Alerts',
      tracking:   'Live Tracking',
      operator:   'Operator',
      signOut:    'Sign out',
      signIn:     'Sign in',
    },
    // ── Login ────────────────────────────────────────────
    login: {
      title:      'SmartTransit',
      subtitle:   'Jordan · النقل الذكي',
      tagline:    'AI-powered public transport platform',
      passenger:  '🚌 Passenger',
      operator:   '⚙ Operator',
      username:   'Username',
      password:   'Password',
      signIn:     'Sign in →',
      invalidCreds: 'Invalid credentials',
      wrongPass:  'Wrong password',
      ministry:   'Ministry of Transport · Jordan',
    },
    // ── Home ─────────────────────────────────────────────
    home: {
      title:        'Where are you going?',
      subtitle:     'AI-powered routes across Amman',
      from:         'From',
      to:           'To',
      fromPlaceholder: 'Enter start location',
      toPlaceholder:   'Enter destination',
      search:       'Find Routes',
      quickRoutes:  'Quick Routes',
      buses:        'buses',
      avgWait:      'avg wait',
      onTime:       'on-time',
      daily:        'daily passengers',
      aiInsight:    'AI Insight',
      liveUpdates:  'Live updates',
    },
    // ── Route Results ────────────────────────────────────
    results: {
      title:        'Available Routes',
      found:        'routes found · AI-enhanced',
      sortBy:       'Sort:',
      fastest:      '⚡ Fastest',
      soonest:      '🕐 Soonest',
      emptiest:     '👥 Emptiest',
      map:          'Map',
      hideMap:      'Hide map',
      departs:      'Departs',
      arrives:      'Arrives',
      duration:     'Duration',
      walk:         'Walk',
      fare:         'Fare',
      seatsLeft:    'seats left',
      standing:     'Standing only',
      aiInsight:    'AI Traffic Insight',
      bestRoute:    'Fastest route',
      leaveSoonest: 'Leaves soonest',
      leastCrowded: 'Least crowded',
      coaster:      'Coaster',
      sarfees:      'Sarfees',
      express:      'Express',
      available:    'Available',
      moderate:     'Moderate',
      full:         'Full',
      aiClear:      'AI: Clear',
      aiModerate:   'AI: Moderate',
      aiHigh:       'AI: High',
    },
    // ── Live Tracking ────────────────────────────────────
    tracking: {
      title:        'Live Tracking',
      arrives:      'Your bus arrives in',
      live:         'LIVE',
      nextStop:     'Next stop',
      late:         'Running late',
      routeProgress:'Route Progress',
      stops:        'stops',
      busHere:      'Bus is here now',
      departed:     'Departed',
      nextBus:      'Following bus · space available',
      aiInsight:    'AI · Traffic',
      aiClear:      'Clear ahead',
      aiModerate:   'Moderate traffic',
      aiHigh:       'Heavy congestion',
      aiGridlock:   'Gridlock detected',
      onSchedule:   'Route is running on schedule',
      updated:      'Updated',
      offline:      'Offline',
      loading:      'Analysing traffic data…',
      min:          'min',
    },
    // ── Alerts ───────────────────────────────────────────
    alerts: {
      title:        'Alerts & Schedule',
      subtitle:     'Real-time transit updates · AI-enhanced',
      refresh:      'Refresh',
      activeAlerts: 'Active Alerts',
      schedule:     'Departure Schedule',
      now:          'Now',
      nextHour:     'Next hour',
      today:        'Today',
      showing:      'Showing',
      of:           'of',
      departures:   'departures',
      viewAll:      'View all today',
      critical:     'Critical',
      warning:      'Warning',
      info:         'Info',
      aiSummary:    'AI · Disruption Summary',
      onTime:       'On time',
      delayed:      'Delayed',
      cancelled:    'Cancelled',
      departs:      'Departs',
      arrives:      'Arrives',
      status:       'Status',
      crowding:     'Crowding',
      platform:     'Platform',
      via:          'via',
      restore:      'Restore dismissed alerts',
      allClear:     'All clear',
      noAlerts:     'No active alerts matching this filter',
    },
    // ── Operator ─────────────────────────────────────────
    operator: {
      title:        'Operator Dashboard',
      welcome:      'Welcome',
      poweredBy:    'Powered by real Amman Vision data',
      live:         'Live · Amman',
      realData:     '📊 18,038 Real Boardings',
      connectedTo:  'Connected to',
      ministry:     'وزارة النقل',
      ministryEn:   'Ministry of Transport · Jordan',
      refresh:      'Refresh',
      dashboard:    'Dashboard',
      fleet:        'Fleet Monitor',
      liveMap:      'Live Map',
      routes:       'Route Manager',
      aiDispatch:   'AI Dispatch',
      demand:       'Demand Analysis',
      reports:      'MOT Reports',
      activeAlerts: 'Alerts',
      settings:     'Settings',
      realBoardings:'Real Boardings',
      activeFleet:  'Active Fleet',
      avgLoad:      'Avg. Load',
      peakHour:     'Peak Hour',
      onTimeRate:   'On-Time Rate',
      liveFleet:    'Live Fleet',
      busId:        'Bus ID',
      route:        'Route',
      driver:       'Driver',
      status2:      'Status',
      load:         'Load',
      delay:        'Delay',
      speed:        'Speed',
      actions:      'Actions',
      active:       'Active',
      delayed2:     'Delayed',
      maintenance:  'Maintenance',
      inDepot:      'In Depot',
      msg:          'Msg',
      dispatch:     'Dispatch',
      aiPanel:      'AI Dispatch',
      pending:      'pending',
      trainedOn:    'real-data trained',
      accept:       'Accept',
      dismiss:      'Dismiss',
      allActioned:  'All actioned',
      monitoring:   'AI monitoring…',
      urgent:       'Urgent',
      conf:         'conf.',
      motReports:   'وزارة النقل Reports',
      exportReady:  'Export ready',
      comingSoon:   '🚧 Coming in next sprint',
      passengerBreakdown: 'Passenger Breakdown',
      realData2:    'Real Data',
      routeLoad:    'Route Load',
      activeAlerts2:'Active Alerts',
      critical2:    'Critical',
    },
    // ── Common ───────────────────────────────────────────
    common: {
      loading:      'Loading…',
      error:        'Something went wrong',
      back:         'Back',
      close:        'Close',
      search:       'Search',
      filter:       'Filter',
      all:          'All',
      minutes:      'min',
      hours:        'hr',
      jd:           'JD',
    },
  },

  ar: {
    // ── Nav ──────────────────────────────────────────────
    nav: {
      home:       'الرئيسية',
      myRoutes:   'مساراتي',
      alerts:     'التنبيهات',
      tracking:   'التتبع المباشر',
      operator:   'المشغّل',
      signOut:    'تسجيل الخروج',
      signIn:     'تسجيل الدخول',
    },
    // ── Login ────────────────────────────────────────────
    login: {
      title:      'سمارت ترانزيت',
      subtitle:   'الأردن · SmartTransit',
      tagline:    'منصة النقل العام المدعومة بالذكاء الاصطناعي',
      passenger:  '🚌 راكب',
      operator:   '⚙ مشغّل',
      username:   'اسم المستخدم',
      password:   'كلمة المرور',
      signIn:     'تسجيل الدخول ←',
      invalidCreds: 'بيانات الاعتماد غير صحيحة',
      wrongPass:  'كلمة المرور خاطئة',
      ministry:   'وزارة النقل · الأردن',
    },
    // ── Home ─────────────────────────────────────────────
    home: {
      title:        'إلى أين تريد الذهاب؟',
      subtitle:     'مسارات مدعومة بالذكاء الاصطناعي عبر عمّان',
      from:         'من',
      to:           'إلى',
      fromPlaceholder: 'أدخل موقع البداية',
      toPlaceholder:   'أدخل الوجهة',
      search:       'البحث عن مسارات',
      quickRoutes:  'مسارات سريعة',
      buses:        'حافلة',
      avgWait:      'متوسط الانتظار',
      onTime:       'في الوقت',
      daily:        'راكب يومياً',
      aiInsight:    'تحليل الذكاء الاصطناعي',
      liveUpdates:  'تحديثات مباشرة',
    },
    // ── Route Results ────────────────────────────────────
    results: {
      title:        'المسارات المتاحة',
      found:        'مسارات متاحة · محسّنة بالذكاء الاصطناعي',
      sortBy:       'ترتيب:',
      fastest:      '⚡ الأسرع',
      soonest:      '🕐 الأقرب',
      emptiest:     '👥 الأقل ازدحاماً',
      map:          'الخريطة',
      hideMap:      'إخفاء الخريطة',
      departs:      'يغادر',
      arrives:      'يصل',
      duration:     'المدة',
      walk:         'مشياً',
      fare:         'الأجرة',
      seatsLeft:    'مقاعد متبقية',
      standing:     'وقوف فقط',
      aiInsight:    'تحليل حركة المرور بالذكاء الاصطناعي',
      bestRoute:    'أسرع مسار',
      leaveSoonest: 'يغادر أولاً',
      leastCrowded: 'الأقل ازدحاماً',
      coaster:      'كوستر',
      sarfees:      'سرفيس',
      express:      'إكسبريس',
      available:    'متاح',
      moderate:     'متوسط',
      full:         'ممتلئ',
      aiClear:      'ذكاء اصطناعي: واضح',
      aiModerate:   'ذكاء اصطناعي: متوسط',
      aiHigh:       'ذكاء اصطناعي: مرتفع',
    },
    // ── Live Tracking ────────────────────────────────────
    tracking: {
      title:        'التتبع المباشر',
      arrives:      'حافلتك تصل خلال',
      live:         'مباشر',
      nextStop:     'المحطة التالية',
      late:         'متأخرة',
      routeProgress:'تقدم المسار',
      stops:        'محطات',
      busHere:      'الحافلة هنا الآن',
      departed:     'غادرت',
      nextBus:      'الحافلة التالية · توجد أماكن',
      aiInsight:    'الذكاء الاصطناعي · المرور',
      aiClear:      'الطريق واضح',
      aiModerate:   'ازدحام متوسط',
      aiHigh:       'ازدحام شديد',
      aiGridlock:   'توقف تام',
      onSchedule:   'الحافلة في موعدها',
      updated:      'تم التحديث',
      offline:      'غير متصل',
      loading:      'جارٍ تحليل بيانات المرور…',
      min:          'دقيقة',
    },
    // ── Alerts ───────────────────────────────────────────
    alerts: {
      title:        'التنبيهات والجدول',
      subtitle:     'تحديثات النقل المباشرة · مدعومة بالذكاء الاصطناعي',
      refresh:      'تحديث',
      activeAlerts: 'التنبيهات النشطة',
      schedule:     'جدول المغادرات',
      now:          'الآن',
      nextHour:     'الساعة القادمة',
      today:        'اليوم',
      showing:      'عرض',
      of:           'من',
      departures:   'مغادرة',
      viewAll:      'عرض كل اليوم',
      critical:     'حرج',
      warning:      'تحذير',
      info:         'معلومات',
      aiSummary:    'الذكاء الاصطناعي · ملخص التعطل',
      onTime:       'في الوقت',
      delayed:      'متأخر',
      cancelled:    'ملغي',
      departs:      'يغادر',
      arrives:      'يصل',
      status:       'الحالة',
      crowding:     'الازدحام',
      platform:     'الرصيف',
      via:          'عبر',
      restore:      'استعادة التنبيهات المخفية',
      allClear:     'كل شيء على ما يرام',
      noAlerts:     'لا توجد تنبيهات نشطة',
    },
    // ── Operator ─────────────────────────────────────────
    operator: {
      title:        'لوحة تحكم المشغّل',
      welcome:      'مرحباً',
      poweredBy:    'مدعوم ببيانات رؤية عمان الحقيقية',
      live:         'مباشر · عمّان',
      realData:     '📊 ١٨٬٠٣٨ ركوب حقيقي',
      connectedTo:  'متصل بـ',
      ministry:     'وزارة النقل',
      ministryEn:   'Ministry of Transport · الأردن',
      refresh:      'تحديث',
      dashboard:    'لوحة التحكم',
      fleet:        'مراقبة الأسطول',
      liveMap:      'الخريطة المباشرة',
      routes:       'إدارة المسارات',
      aiDispatch:   'توزيع الذكاء الاصطناعي',
      demand:       'تحليل الطلب',
      reports:      'تقارير الوزارة',
      activeAlerts: 'التنبيهات',
      settings:     'الإعدادات',
      realBoardings:'ركوب حقيقي',
      activeFleet:  'الأسطول النشط',
      avgLoad:      'متوسط التحميل',
      peakHour:     'ساعة الذروة',
      onTimeRate:   'نسبة الالتزام',
      liveFleet:    'الأسطول المباشر',
      busId:        'رقم الحافلة',
      route:        'المسار',
      driver:       'السائق',
      status2:      'الحالة',
      load:         'التحميل',
      delay:        'التأخير',
      speed:        'السرعة',
      actions:      'إجراءات',
      active:       'نشط',
      delayed2:     'متأخر',
      maintenance:  'صيانة',
      inDepot:      'في المستودع',
      msg:          'رسالة',
      dispatch:     'توزيع',
      aiPanel:      'توزيع الذكاء الاصطناعي',
      pending:      'في الانتظار',
      trainedOn:    'مدرَّب على بيانات حقيقية',
      accept:       'قبول',
      dismiss:      'رفض',
      allActioned:  'تمت معالجة الكل',
      monitoring:   'الذكاء الاصطناعي يراقب…',
      urgent:       'عاجل',
      conf:         'ثقة',
      motReports:   'تقارير وزارة النقل',
      exportReady:  'جاهز للتصدير',
      comingSoon:   '🚧 قريباً',
      passengerBreakdown: 'توزيع الركاب',
      realData2:    'بيانات حقيقية',
      routeLoad:    'تحميل المسار',
      activeAlerts2:'التنبيهات النشطة',
      critical2:    'حرج',
    },
    // ── Common ───────────────────────────────────────────
    common: {
      loading:      'جارٍ التحميل…',
      error:        'حدث خطأ ما',
      back:         'رجوع',
      close:        'إغلاق',
      search:       'بحث',
      filter:       'تصفية',
      all:          'الكل',
      minutes:      'دقيقة',
      hours:        'ساعة',
      jd:           'دينار',
    },
  },
} as const;

export type Translations = typeof translations.en;

interface LangContextType {
  lang:   Lang;
  setLang:(l: Lang) => void;
  t:      Translations;
  isRTL:  boolean;
}

const LangContext = createContext<LangContextType>({
  lang:   'en',
  setLang: () => {},
  t:      translations.en,
  isRTL:  false,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('st_lang') as Lang) || 'en'; } catch { return 'en'; }
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('st_lang', l); } catch {}
    // Set document direction
    document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  useEffect(() => {
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    // Load Arabic font if needed
    if (lang === 'ar') {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Arabic:wght@400;500;600;700;800&display=swap';
      if (!document.querySelector('link[href*="IBM+Plex+Arabic"]')) {
        document.head.appendChild(link);
      }
    }
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] as Translations, isRTL: lang === 'ar' }}>
      <div style={{ fontFamily: lang === 'ar' ? "'IBM Plex Arabic', 'DM Sans', sans-serif" : "'DM Sans', sans-serif" }}>
        {children}
      </div>
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/* Language toggle button — drop this anywhere in your UI */
export function LangToggle({ style: extraStyle }: { style?: React.CSSProperties }) {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 99,
        border: '1.5px solid #DDE6EE', background: 'white',
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'all 0.2s',
        fontSize: '0.82rem', fontWeight: 700,
        color: '#0F2240',
        ...extraStyle,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#00C896'; e.currentTarget.style.color = '#00A87C'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#DDE6EE'; e.currentTarget.style.color = '#0F2240'; }}
      title={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}
    >
      {lang === 'en' ? (
        <><span style={{ fontSize: 16 }}>🇯🇴</span> عر</>
      ) : (
        <><span style={{ fontSize: 16 }}>🇬🇧</span> EN</>
      )}
    </button>
  );
}
