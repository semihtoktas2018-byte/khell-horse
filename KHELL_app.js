(() => {
  const WA_NUMBER = (window.KHELL_CONFIG && window.KHELL_CONFIG.whatsappNumber) || "905446452430";

  const fallbackRaces = [
    {
      raceName:"1. Koşu", time:"13:00", track:"İstanbul Veliefendi", surface:"ÇİM", distance:1200, type:"Maiden",
      horses:[
        {number:1,name:"RAHAT OLL",jockey:"A. Demir",weight:54,age:4,lastRuns:[6,4,3,2,1],surface:"çim",preferredSurface:"çim",distance:1200,preferredDistanceMin:1000,preferredDistanceMax:1400,odds:14.80,agf:4.5,isFavorite:false,jockeyWinRate:18,trainerWinRate:12},
        {number:2,name:"ALTIN KANAT",jockey:"M. Yıldız",weight:58,age:5,lastRuns:[1,2,1,3,2],surface:"çim",preferredSurface:"çim",distance:1200,preferredDistanceMin:1000,preferredDistanceMax:1400,odds:2.10,agf:42,isFavorite:true,jockeyWinRate:24,trainerWinRate:19},
        {number:3,name:"MAVİ DALGA",jockey:"S. Kaya",weight:56,age:4,lastRuns:[4,3,2,4,3],surface:"çim",preferredSurface:"çim",distance:1200,preferredDistanceMin:1200,preferredDistanceMax:1600,odds:7.80,agf:11,isFavorite:false,jockeyWinRate:14,trainerWinRate:10}
      ]
    },
    {
      raceName:"2. Koşu", time:"13:45", track:"İstanbul Veliefendi", surface:"ÇİM", distance:1400, type:"Handikap",
      horses:[
        {number:1,name:"SAFKAN RÜZGAR",jockey:"H. Kurt",weight:55,age:4,lastRuns:[5,3,2,2,1],surface:"çim",preferredSurface:"çim",distance:1400,preferredDistanceMin:1200,preferredDistanceMax:1600,odds:9.40,agf:6,isFavorite:false,jockeyWinRate:17,trainerWinRate:13},
        {number:2,name:"OCEAN KING",jockey:"B. Can",weight:60,age:5,lastRuns:[1,1,2,1,3],surface:"çim",preferredSurface:"çim",distance:1400,preferredDistanceMin:1200,preferredDistanceMax:1600,odds:1.85,agf:48,isFavorite:true,jockeyWinRate:23,trainerWinRate:17},
        {number:3,name:"GÜMÜŞ OK",jockey:"E. Ak",weight:53,age:3,lastRuns:[6,5,4,3,2],surface:"çim",preferredSurface:"çim",distance:1400,preferredDistanceMin:1400,preferredDistanceMax:1800,odds:18.20,agf:3.2,isFavorite:false,jockeyWinRate:12,trainerWinRate:9}
      ]
    },
    {
      raceName:"3. Koşu", time:"14:30", track:"İstanbul Veliefendi", surface:"KUM", distance:1600, type:"Grup 3",
      horses:[
        {number:4,name:"DAĞIN KARTALI",jockey:"T. Öz",weight:54,age:4,lastRuns:[4,3,2,1,2],surface:"kum",preferredSurface:"kum",distance:1600,preferredDistanceMin:1400,preferredDistanceMax:1800,odds:11.00,agf:5.4,isFavorite:false,jockeyWinRate:19,trainerWinRate:15},
        {number:7,name:"BLAZE FIRE",jockey:"A. Sel",weight:59,age:5,lastRuns:[2,1,1,3,1],surface:"kum",preferredSurface:"kum",distance:1600,preferredDistanceMin:1200,preferredDistanceMax:1600,odds:2.40,agf:38,isFavorite:true,jockeyWinRate:20,trainerWinRate:16},
        {number:9,name:"ŞİMŞEK ALİ",jockey:"O. Yalçın",weight:52,age:3,lastRuns:[7,5,3,2,2],surface:"kum",preferredSurface:"kum",distance:1600,preferredDistanceMin:1600,preferredDistanceMax:2000,odds:21.50,agf:2.8,isFavorite:false,jockeyWinRate:11,trainerWinRate:8}
      ]
    }
  ];

  const races = normalizeRaces(
    window.KHELL_RACES || window.demoRaces || window.DEMO_RACES || window.races || fallbackRaces
  );

  const engine = window.KhellEngine || window.KHELL_ENGINE || {};
  const analysis = typeof engine.analyzeAllRaces === "function" ? engine.analyzeAllRaces(races) : fallbackAnalyze(races);

  function normalizeRaces(input){
    if(!Array.isArray(input)) return fallbackRaces;
    return input.map((r,idx)=>({
      raceName: r.raceName || r.name || `${idx+1}. Koşu`,
      time: r.time || r.hour || ["13:00","13:45","14:30","15:15","16:00"][idx] || "--:--",
      track: r.track || r.hippodrome || "İstanbul Veliefendi",
      surface: (r.surface || "çim").toString().toLowerCase(),
      distance: r.distance || 1400,
      type: r.type || r.category || "Handikap",
      horses: Array.isArray(r.horses) ? r.horses : []
    }));
  }

  function fallbackAnalyze(races){
    const raceAnalyses = races.map(r => {
      const horses = r.horses.map(h => {
        const formScore = Math.max(10, Math.min(100, (h.lastRuns || [5]).reduce((a,p)=>a+(8-p)*8,0)));
        const surpriseScore = Math.round(Math.min(100, (h.odds || 5)*4 + formScore*.45 + (h.isFavorite ? -20 : 12)));
        const riskScore = Math.round(Math.min(100, (h.odds || 5)*1.3 + (100-formScore)*.35));
        return {...h, formScore, surpriseScore, riskScore, overallScore:Math.round((formScore+surpriseScore)/2)};
      }).sort((a,b)=>b.surpriseScore-a.surpriseScore);
      const hiddenBomb = horses[0];
      return {
        raceName:r.raceName,
        race:r,
        horses,
        hiddenBomb:{horseNumber:hiddenBomb.number,horseName:hiddenBomb.name,odds:hiddenBomb.odds,surpriseScore:hiddenBomb.surpriseScore,comment:"KHELL fırsat işaretledi"},
        valuePick:null,
        favoriteRisk:null,
        safeCoupon:horses.slice(0,2).map(h=>({horseNumber:h.number,horseName:h.name,odds:h.odds})),
        balancedCoupon:horses.slice(0,3).map(h=>({horseNumber:h.number,horseName:h.name,odds:h.odds})),
        surpriseCoupon:horses.slice(0,2).map(h=>({horseNumber:h.number,horseName:h.name,odds:h.odds})),
        exactaCandidates:[{first:horses[0]?.number,second:horses[1]?.number,potential:92}],
        tabelaCandidates:horses.slice(0,3).map(h=>({horseNumber:h.number,horseName:h.name,tabelaScore:h.surpriseScore})),
        tripleCandidates:horses.slice(0,3).map(h=>({horseNumber:h.number,horseName:h.name,tripleScore:h.surpriseScore}))
      };
    });
    return {
      totalRaces:races.length,
      raceAnalyses,
      bestHiddenBomb: {...raceAnalyses[0].hiddenBomb, raceName:raceAnalyses[0].raceName},
      bestValuePick: null,
      bestExacta: raceAnalyses[0].exactaCandidates[0],
      bestTabela: raceAnalyses[0].tabelaCandidates[0],
      bestTriple: {raceName:raceAnalyses[0].raceName,horses:raceAnalyses[0].tripleCandidates.map(x=>`${x.horseNumber} - ${x.horseName}`),score:90},
      riskyFavorites: [],
      daySummary:"KHELL günlük analiz tamamlandı."
    };
  }

  // couponCopyTexts modül seviyesinde — renderCoupon her çağrıldığında doğru çalışır
  const couponCopyTexts = {};

  function q(id){return document.getElementById(id)}
  function moneyLink(text){return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`}

  // At ismi/numarası için merkezi çözüm — tüm field alias'larını kapsar
  function resolveHorseName(h){ return h.name || h.horseName || h.atAdi || ''; }
  function resolveHorseNum(h){ const n = h.number ?? h.horseNumber ?? h.no ?? ''; return n === '' ? '-' : n; }
  function isValidHorse(h){
    const name = resolveHorseName(h);
    return name && name !== 'AT ADI' && name !== 'Bilinmiyor' && name !== '';
  }

  const allAnalyses = (analysis.raceAnalyses || []).map((a,idx)=>({...a, race:races[idx] || {}}));
  const bomb = analysis.bestHiddenBomb || allAnalyses[0]?.hiddenBomb || {};
  const heroRace = allAnalyses.find(a => a.raceName === bomb.raceName) || allAnalyses[0];
  const bombScore = clamp(bomb.surpriseScore || 86,0,100);

  q("heroHorse").textContent = bomb.horseName || "RAHAT OLL";
  q("heroRace").textContent = `${bomb.raceName || heroRace?.raceName || "1. Koşu"} • ${heroRace?.race?.track || "İstanbul Veliefendi"}`;
  q("heroOdds").textContent = bomb.odds || "14.80";
  q("heroScore").textContent = bombScore;
  q("heroRisk").textContent = riskText(bombScore);
  q("heroNote").innerHTML = `<b>KHELL fırsat işaretledi</b> — gözden kaçan sürpriz potansiyeli.`;
  q("ringScore").textContent = `%${bombScore}`;
  q("heroRing").style.strokeDashoffset = 364 - (364 * bombScore / 100);
  q("liveTicker").textContent = `${analysis.daySummary || "KHELL günlük analiz tamamlandı."}  •  VIP sinyaller ve özel kuponlar WhatsApp üzerinden açılır.`;
  q("raceCount").textContent = `${races.length} koşu`;

  const tickerMessages = [
    {icon:"⚠️", text:"KHELL risk görüyor"},
    {icon:"⚡", text:"Sürpriz hareket algılandı"},
    {icon:"💰", text:"Yüksek oran fırsatı işaretlendi"},
    {icon:"🔴", text:"Favori üstünde baskı oluştu"},
    {icon:"🎯", text:"KHELL fırsat işaretledi"},
    {icon:"📊", text:"Form analizi tamamlandı"},
    {icon:"🚨", text:"Sürpriz alarm aktif"},
    {icon:"💎", text:"Değerli oran tespit edildi"}
  ];
  let tickerIdx = 0;
  function rotateTicker(){
    const t = tickerMessages[tickerIdx % tickerMessages.length];
    const lbl = q("tickerLabel");
    if(lbl) lbl.textContent = `${t.icon} ${t.text}`;
    tickerIdx++;
  }
  rotateTicker();
  setInterval(rotateTicker, 4000);

  const opps = [
    {type:"⚡ Sürpriz", name:bomb.horseName || "-", race:bomb.raceName || "-", score:bombScore, tag:"/100", cls:"gold"},
    {type:"💰 Değerli Ganyan", name:(analysis.bestValuePick?.horseName || allAnalyses[1]?.hiddenBomb?.horseName || "DAĞIN KARTALI"), race:(analysis.bestValuePick?.raceName || "3. Koşu"), score:(analysis.bestValuePick?.odds || "11.00"), tag:"ORAN", cls:"green"},
    {type:"🎯 Sürpriz İkili", name: exactaText(), race:(analysis.bestExacta?.raceName || "2. Koşu"), score:(analysis.bestExacta?.potential || 95), tag:"PUAN", cls:"blue"},
    {type:"🏅 Tabela", name:(analysis.bestTabela?.horseName || "SAFKAN RÜZGAR"), race:(analysis.bestTabela?.raceName || "2. Koşu"), score:(analysis.bestTabela?.score || 83), tag:"PUAN", cls:"orange"},
    {type:"🎲 Üçlü", name:(analysis.bestTriple?.horses?.slice(0,2).join(" / ") || "2 - 3 - 7"), race:(analysis.bestTriple?.raceName || "1. Koşu"), score:(analysis.bestTriple?.score || 90), tag:"PUAN", cls:"gold"}
  ];
  const oppTrustLevels = [88, 74, 91, 68, 82];
  const oppRiskMeta = [
    {text:"DÜŞÜK RİSK", cls:"risk-low"},
    {text:"ORTA RİSK",  cls:"risk-mid"},
    {text:"DÜŞÜK RİSK", cls:"risk-low"},
    {text:"ORTA RİSK",  cls:"risk-mid"},
    {text:"DÜŞÜK RİSK", cls:"risk-low"}
  ];
  const oppStatusLabels = [
    {text:"Sürpriz Alarmı",  cls:"status-alarm"},
    {text:"Değerli Oran",    cls:"status-value"},
    {text:"Yüksek Potansiyel", cls:"status-high"},
    {text:"Riskli Favori",   cls:"status-risky"},
    {text:"Yüksek Potansiyel", cls:"status-high"}
  ];
  q("opportunities").innerHTML = opps.map((o, i) => {
    const trust  = oppTrustLevels[i] || 75;
    const risk   = oppRiskMeta[i] || {text:"ORTA RİSK", cls:"risk-mid"};
    const status = oppStatusLabels[i] || {text:"Fırsat", cls:"status-high"};
    return `
    <article class="opp-card ${o.cls}" data-opp-idx="${i}" style="cursor:pointer;">
      <div class="opp-trust">%${trust} güven</div>
      <div class="opp-type">${o.type}</div>
      <div class="opp-name">${o.name}</div>
      <div class="opp-race">${o.race}</div>
      <div class="opp-status ${status.cls}">${status.text}</div>
      <div class="opp-risk-badge ${risk.cls}">${risk.text}</div>
      <div class="opp-score">${o.score}</div>
      <div class="opp-tag">${o.tag}</div>
    </article>
  `}).join("");

  const oppRaceIndices = [
    allAnalyses.findIndex(a => a.raceName === (bomb.raceName || allAnalyses[0]?.raceName)),
    allAnalyses.findIndex(a => a.raceName === (analysis.bestValuePick?.raceName || "3. Koşu")),
    allAnalyses.findIndex(a => a.raceName === (analysis.bestExacta?.raceName || "2. Koşu")),
    allAnalyses.findIndex(a => a.raceName === (analysis.bestTabela?.raceName || "2. Koşu")),
    allAnalyses.findIndex(a => a.raceName === (analysis.bestTriple?.raceName || "1. Koşu"))
  ].map(idx => idx === -1 ? 0 : idx);

  document.querySelectorAll(".opp-card[data-opp-idx]").forEach(card => {
    card.addEventListener("click", () => openDetail(oppRaceIndices[Number(card.dataset.oppIdx)]));
  });

  const raceCards = allAnalyses.map((a,idx)=>raceCard(a,idx)).join("");
  q("raceList").innerHTML = raceCards;
  q("raceListFull").innerHTML = raceCards;
  document.querySelectorAll(".detail-btn").forEach(btn => btn.addEventListener("click", () => openDetail(Number(btn.dataset.idx))));

  renderCoupon("safe");
  renderWins();
  setupNav();
  setupCouponTabs();
  setupWhatsApp();

  function raceCard(a,idx){
    const r = a.race || {};
    const h = a.hiddenBomb || {};
    const score = h.surpriseScore || 70;
    const formVal = score >= 82 ? "7.8" : score >= 65 ? "6.4" : "5.1";
    const tempo = score >= 82 ? "Güçlü" : score >= 65 ? "Orta" : "Zayıf";
    return `
      <article class="race-card">
        <div class="race-top">
          <div class="race-no">${a.raceName || r.raceName || `${idx+1}. Koşu`}</div>
          <div class="race-time">${r.time || "--:--"}</div>
        </div>
        <div class="chips">
          <span class="chip">${r.track || "İstanbul Veliefendi"}</span>
          <span class="chip">${r.surface || "ÇİM"}</span>
          <span class="chip">${r.distance || 1400}m</span>
          <span class="chip">${r.type || "Handikap"}</span>
        </div>
        <div class="race-pick">
          <div><small>KHELL sürpriz gördü</small><b>${h.horseName || "-"}</b></div>
          <strong>${score}</strong>
        </div>
        <div class="race-mini-form">
          <span class="mini-form-item">📊 Form <b>${formVal}</b></span>
          <span class="mini-form-item">⚡ Tempo <b>${tempo}</b></span>
          <span class="mini-form-item risk-badge ${riskClass(score)}">${riskText(score)} RİSK</span>
        </div>
        <div class="race-foot">
          <span></span>
          <button class="detail-btn" data-idx="${idx}">DETAY →</button>
        </div>
      </article>
    `;
  }

  // ── Form rozeti renderer ─────────────────────────────
  function formDots(lastRuns){
    if(!Array.isArray(lastRuns) || lastRuns.length === 0)
      return '<span class="form-empty">form yok</span>';
    return lastRuns.slice(0,6).map(pos => {
      const p = parseInt(pos);
      const cls = p === 1 ? "fd-1" : p === 2 ? "fd-2" : p === 3 ? "fd-3" : p <= 4 ? "fd-4" : "fd-5";
      return `<span class="form-dot ${cls}">${p}</span>`;
    }).join("");
  }

  // ── KHELL at yorumu üretici ──────────────────────────
  function khellHorseComment(h, isPick){
    const sc  = h.surpriseScore || 70;
    const rs  = h.riskScore     || 35;
    const fs  = h.formScore     || 70;
    const odd = parseFloat(h.odds) || 5;
    const agf = parseFloat(h.agf)  || 10;
    const hasData = h.jockey && h.odds && h.formScore;
    if(!hasData) return "Bazı veri alanları eksik olduğu için yorum sınırlıdır.";
    if(h.isFavorite && rs >= 60) return "KHELL bu favoride risk görüyor. AGF yüksek, baskı altında izlenmeli.";
    if(sc >= 82 && odd >= 8)     return "KHELL bu atta oran/AGF dengesine göre değerli aday sinyali görüyor.";
    if(sc >= 82)                 return "KHELL bu atta sürpriz potansiyeli görüyor. Form seyri dikkat çekici.";
    if(odd >= 8 && agf <= 6)     return "Oran/AGF dengesi değerli bölgede. KHELL izlemekte.";
    if(rs >= 65)                 return "KHELL bu atta risk görüyor. Dikkatli değerlendirilmelidir.";
    if(fs <= 45)                 return "Form tarafı zayıf. KHELL bu koşuda sınırlı potansiyel görüyor.";
    if(isPick)                   return "KHELL bu atta sürpriz potansiyeli görüyor. Tabela/sürpriz adayı olarak izleniyor.";
    return "KHELL bu atı standart form beklentisi içinde değerlendiriyor.";
  }

  function khellHorseTag(h, isPick){
    const sc  = h.surpriseScore || 70;
    const rs  = h.riskScore     || 35;
    const odd = parseFloat(h.odds) || 0;
    const agf = parseFloat(h.agf)  || 0;
    const hasOdds = odd > 0;
    const hasAgf  = agf > 0;
    if(!h.jockey && !hasOdds)             return {label:"Veri Sınırlı",       cls:"tag-watch"};
    if(h.isFavorite && rs >= 60)          return {label:"Riskli Favori",      cls:"tag-risk"};
    if(sc >= 82 && hasOdds && odd >= 8
       && hasAgf)                         return {label:"Değerli Oran Adayı", cls:"tag-value"};
    if(sc >= 82)                          return {label:"Sürpriz Potansiyeli",cls:"tag-surprise"};
    if(isPick)                            return {label:"Tabela Adayı",       cls:"tag-tabela"};
    if(rs >= 65)                          return {label:"Riskli",             cls:"tag-risk"};
    return                                       {label:"İzlemeye Değer",     cls:"tag-watch"};
  }

  function horseStrengths(h){
    const list = [];
    const dist = parseFloat(h.distance) || 1400;
    const minD = parseFloat(h.preferredDistanceMin) || dist - 300;
    const maxD = parseFloat(h.preferredDistanceMax) || dist + 300;
    if(dist >= minD && dist <= maxD)                         list.push("Mesafe uyumu iyi");
    if((h.surface||"") === (h.preferredSurface||""))         list.push("Zemin tercihi uygun");
    if(parseFloat(h.agf) <= 6 && (h.surpriseScore||70)>=75) list.push("AGF düşük, sürpriz skoru yüksek");
    if(parseFloat(h.odds) >= 8 && (h.surpriseScore||70)>=75)list.push("Oran değerli bölgede");
    if((h.jockeyWinRate||0) >= 18)                           list.push(`Jokey kazanma oranı güçlü (%${h.jockeyWinRate})`);
    if((h.trainerWinRate||0) >= 15)                          list.push(`Antrenör kazanma oranı iyi (%${h.trainerWinRate})`);
    const runs = h.lastRuns || [];
    if(runs.length >= 3 && runs[0] < runs[1] && runs[1] < runs[2]) list.push("Son 3 koşuda form yükselişi");
    return list;
  }

  function horseWeaknesses(h){
    const list = [];
    const dist = parseFloat(h.distance) || 1400;
    const minD = parseFloat(h.preferredDistanceMin) || dist - 300;
    const maxD = parseFloat(h.preferredDistanceMax) || dist + 300;
    if(dist < minD || dist > maxD)           list.push("Mesafe tercihi dışında koşuyor");
    if((h.surface||"") !== (h.preferredSurface||"")) list.push("Zemin uyumsuzluğu var");
    if((h.formScore||70) <= 45)              list.push("Form verisi zayıf");
    if((h.jockeyWinRate||0) <= 10)           list.push(`Jokey kazanma oranı düşük (%${h.jockeyWinRate||0})`);
    if((h.trainerWinRate||0) <= 8)           list.push(`Antrenör kazanma oranı düşük (%${h.trainerWinRate||0})`);
    if((h.riskScore||35) >= 65)              list.push("Risk skoru yüksek");
    if(!h.jockey || !h.odds)                 list.push("Eksik veri alanı mevcut");
    return list;
  }

  function openDetail(idx){
    const a = allAnalyses[idx];
    if(!a) return;

    // Orijinal at verisi (latest.json'dan) — scoring bazı alanları düşürmüş olabilir
    const origHorses = (a.race && Array.isArray(a.race.horses)) ? a.race.horses : [];

    const horses = (a.horses || [])
      .filter(isValidHorse)
      .map(h => {
        // Scoring sonucundaki at ile orijinal at verisini numaraya göre eşleştir
        const num  = resolveHorseNum(h);
        const orig = origHorses.find(o => String(resolveHorseNum(o)) === String(num)) || {};

        // Her alan için: scoring sonucu → orijinal veri → fallback
        const jockey   = h.jockey   || orig.jockey   || h.jokey      || orig.jokey   || null;
        const weight   = h.weight   || orig.weight   || h.kilo        || orig.kilo    || null;
        const age      = h.age      || orig.age      || h.yas         || orig.yas     || null;
        const odds     = h.odds     || orig.odds     || h.oran        || orig.oran    || null;
        const agf      = h.agf      || orig.agf      || h.AGF         || orig.AGF     || null;
        const lastRuns = Array.isArray(h.lastRuns)   ? h.lastRuns
                       : Array.isArray(orig.lastRuns)? orig.lastRuns
                       : Array.isArray(h.sonKosular) ? h.sonKosular
                       : Array.isArray(h.form)       ? h.form
                       : [];

        return {
          ...orig,   // önce orijinal tüm alanlar
          ...h,      // üstüne scoring eklemeleri (formScore, surpriseScore vb.)
          number:        num,
          name:          resolveHorseName(h) || resolveHorseName(orig),
          formScore:     h.formScore     || 70,
          surpriseScore: h.surpriseScore || 70,
          riskScore:     h.riskScore     || 35,
          jockey, weight, age, odds, agf, lastRuns,
        };
      });

    const pickNo      = a.hiddenBomb?.horseNumber;
    const bombH       = horses.find(h => h.number == pickNo) || horses[0];
    const sc          = a.hiddenBomb?.surpriseScore || 70;
    const raceRisk    = riskText(sc);
    const r           = a.race || {};

    q("modalContent").innerHTML = `
      <!-- KOŞU BAŞLIK -->
      <div class="modal-race-header">
        <div class="modal-race-title">
          <span class="modal-race-name">${a.raceName}</span>
          <span class="modal-race-time">${r.time || "--:--"}</span>
        </div>
        <div class="modal-race-chips">
          <span class="chip">${r.track || "Veliefendi"}</span>
          <span class="chip">${r.surface || "çim"}</span>
          <span class="chip">${r.distance || 1400}m</span>
          <span class="chip">${r.type || "Handikap"}</span>
        </div>
      </div>

      <!-- KHELL SEÇİMİ BANNER -->
      <div class="detail-pick-banner">
        <div class="detail-pick-label">⚡ KHELL Seçimi</div>
        <div class="detail-pick-name">${bombH?.name || "-"}</div>
        <div class="detail-pick-meta">
          <span class="coupon-badge odds">Oran ${bombH?.odds || "-"}</span>
          <span class="coupon-badge trust">Sürpriz ${sc}</span>
          <span class="coupon-badge risk">${raceRisk} RİSK</span>
          <span class="coupon-badge">🐴 ${horses.length} At</span>
        </div>
      </div>

      <!-- AT LİSTESİ -->
      <div class="acc-list-header">AT ANALİZLERİ <span>— karta tıkla, detay aç</span></div>
      <div id="accordionList">
        ${horses.map((h, hi) => {
          const isPick   = h.number == pickNo;
          const tag      = khellHorseTag(h, isPick);
          const comment  = khellHorseComment(h, isPick);
          const strList  = horseStrengths(h);
          const wkList   = horseWeaknesses(h);
          const rsCls    = h.riskScore >= 65 ? "red" : h.riskScore >= 45 ? "orange" : "green";
          const scCls    = h.surpriseScore >= 80 ? "gold" : h.surpriseScore >= 65 ? "green" : "";
          const dots     = formDots(h.lastRuns);
          return `
          <div class="acc-item ${isPick ? "acc-pick" : ""}">

            <!-- AT KARTI HEADER — tıklanabilir -->
            <div class="acc-header" onclick="khellToggleAcc(${hi})">

              <!-- Sol: numara -->
              <div class="acc-num ${isPick ? "acc-num-pick" : ""}">${h.number}</div>

              <!-- Orta: at bilgileri -->
              <div class="acc-info">
                <div class="acc-name-row">
                  <b>${h.name}</b>
                  ${isPick ? '<span class="pick-star">★</span>' : ""}
                </div>
                <div class="acc-sub-row">
                  <span class="acc-sub-item">👤 ${h.jockey || "Jokey -"}</span>
                  ${h.weight ? `<span class="acc-sub-item">⚖️ ${h.weight}kg</span>` : `<span class="acc-sub-item" style="color:var(--muted)">Kilo -</span>`}
                  ${h.age    ? `<span class="acc-sub-item">📅 ${h.age}y</span>`    : `<span class="acc-sub-item" style="color:var(--muted)">Yaş -</span>`}
                </div>
                <!-- Form rozetleri -->
                <div class="acc-form-row">${dots}</div>
              </div>

              <!-- Sağ: skorlar + ok -->
              <div class="acc-right">
                <div class="acc-odds-block">
                  <span class="acc-odds-val">${h.odds || "-"}</span>
                  <span class="acc-odds-lbl">ORAN</span>
                </div>
                <div class="acc-score-block">
                  <span class="acc-score-val ${scCls}">${h.surpriseScore}</span>
                  <span class="acc-score-lbl">SÜRPRİZ</span>
                </div>
                <span class="acc-arrow" id="acc-arrow-${hi}">›</span>
              </div>

            </div>

            <!-- ETİKET BANDI -->
            <div class="acc-tag-band">
              <span class="acc-tag ${tag.cls}">${tag.label}</span>
              ${h.agf ? `<span class="acc-tag-agf">AGF ${h.agf}</span>` : ""}
            </div>

            <!-- ACCORDION DETAY -->
            <div class="acc-body" id="acc-body-${hi}" style="display:none;">

              <!-- Metrik kutuları -->
              <div class="acc-metrics">
                <div class="acc-metric"><small>FORM</small><b>${h.formScore}</b></div>
                <div class="acc-metric"><small>SÜRPRİZ</small><b class="${scCls}">${h.surpriseScore}</b></div>
                <div class="acc-metric"><small>RİSK</small><b class="${rsCls}">${h.riskScore}</b></div>
                <div class="acc-metric"><small>JOKEY %</small><b>${h.jockeyWinRate || "-"}</b></div>
                <div class="acc-metric"><small>ANTRENÖR %</small><b>${h.trainerWinRate || "-"}</b></div>
              </div>

              <!-- Güçlü taraflar -->
              ${strList.length ? `
              <div class="acc-section-label">✅ Güçlü Taraflar</div>
              <ul class="acc-list acc-list-green">${strList.map(s=>`<li>${s}</li>`).join("")}</ul>` : ""}

              <!-- Dikkat edilmesi gerekenler -->
              ${wkList.length ? `
              <div class="acc-section-label">⚠️ Dikkat Edilmesi Gerekenler</div>
              <ul class="acc-list acc-list-orange">${wkList.map(w=>`<li>${w}</li>`).join("")}</ul>` : ""}

              <!-- KHELL yorumu -->
              <div class="khell-note" style="margin-top:10px;">
                <b>KHELL:</b> ${comment}
              </div>

            </div>
          </div>`;
        }).join("")}
      </div>
    `;
    modalOpen();
  }

  // Accordion toggle — global, modal içinden erişilebilir
  window.khellToggleAcc = function(hi){
    const body  = document.getElementById("acc-body-"  + hi);
    const arrow = document.getElementById("acc-arrow-" + hi);
    if(!body) return;
    const isOpen = body.style.display !== "none";
    document.querySelectorAll(".acc-body").forEach(b  => b.style.display = "none");
    document.querySelectorAll(".acc-arrow").forEach(ar => { ar.textContent = "›"; ar.classList.remove("open"); });
    if(!isOpen){
      body.style.display = "block";
      if(arrow){ arrow.textContent = "⌄"; arrow.classList.add("open"); }
    }
  };

  function modalOpen(){
    q("detailModal").classList.add("show");
    document.body.classList.add("modal-open");
  }
  function modalClose(){
    q("detailModal").classList.remove("show");
    document.body.classList.remove("modal-open");
  }

  q("modalClose").addEventListener("click", modalClose);
  q("detailModal").addEventListener("click", function(e){
    if(e.target === this) modalClose();
  });
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape") modalClose();
  });

  function renderCoupon(type){
    const items = [];
    allAnalyses.forEach(a=>{
      let list = [];
      if(type==="safe") list = a.safeCoupon || [];
      if(type==="balanced") list = a.balancedCoupon || [];
      if(type==="surprise") list = a.surpriseCoupon || [];
      if(type==="exacta") list = (a.exactaCandidates || []).map(x=>({horseNumber:`${x.first}→${x.second}`,horseName:"Sürpriz ikili",odds:x.potential}));
      if(type==="tabela") list = a.tabelaCandidates || [];
      if(type==="triple") list = a.tripleCandidates || [];
      if(list.length) items.push({race:a.raceName, list:list.slice(0,3)});
    });

    q("couponContent").innerHTML = items.map((block, blockIdx)=>{
      const totalOdds = block.list.reduce((acc,i)=>{
        const o = parseFloat(i.odds || i.potential || i.tabelaScore || i.tripleScore || 1);
        return acc * (isNaN(o) ? 1 : o);
      }, 1).toFixed(2);
      const trustPct = type==="safe" ? 84 : type==="balanced" ? 72 : type==="surprise" ? 61 : 76;
      const riskLabel = type==="safe" ? {text:"DÜŞÜK RİSK",cls:"risk"} : type==="surprise" ? {text:"YÜKSEK RİSK",cls:"risk"} : {text:"ORTA RİSK",cls:"risk"};

      // Şablon/boş/duplicate atları filtrele
      const seen = new Set();
      const uniqueList = block.list.filter(i => {
        const num  = i.horseNumber ?? i.number ?? '';
        const name = i.horseName  ?? i.name    ?? '';
        if(!name || name === 'AT ADI' || name === 'Bilinmiyor') return false;
        const key = String(num) + String(name);
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if(!uniqueList.length) return '';

      couponCopyTexts[blockIdx] = block.race + '\n' + uniqueList.map(i => {
        const num  = i.horseNumber ?? i.number ?? '-';
        const name = i.horseName  ?? i.name    ?? '';
        const val  = i.odds || i.potential || i.tabelaScore || i.tripleScore || '';
        return num + ' - ' + name + (val ? ' (' + val + ')' : '');
      }).join('\n');

      return `
      <div class="coupon-card">
        <div class="coupon-title">${block.race}</div>
        <div class="coupon-meta">
          <span class="coupon-badge odds">Toplam Oran: ${totalOdds}</span>
          <span class="coupon-badge trust">%${trustPct} güven</span>
          <span class="coupon-badge ${riskLabel.cls}">${riskLabel.text}</span>
        </div>
        ${uniqueList.map(i => {
          const num  = i.horseNumber ?? i.number ?? '-';
          const name = i.horseName  ?? i.name    ?? '';
          const val  = i.odds || i.potential || i.tabelaScore || i.tripleScore || '';
          return `<div class="coupon-item"><b>${num} - ${name}</b><span>${val}</span></div>`;
        }).join("")}
        <button class="share-btn" data-block="${blockIdx}">Kopyala</button>
      </div>`;
    }).filter(Boolean).join("") || `<div class="coupon-card">Bu kategoride veri yok.</div>`;

    document.querySelectorAll("#couponContent .share-btn").forEach(btn => {
      btn.addEventListener("click", function() {
        const txt = couponCopyTexts[this.dataset.block] || '';
        if(navigator.clipboard) navigator.clipboard.writeText(txt);
      });
    });
  }

  function renderWins(){
    const wins = [
      ["RAHAT OLL","1. Koşu • Sürpriz", "14.80"],
      ["SAFKAN RÜZGAR","2. Koşu • Tabela", "9.40"],
      ["DAĞIN KARTALI","3. Koşu • Değerli ganyan", "11.00"],
      ["2 → 3","Sürpriz ikili", "95.5"]
    ];
    q("winsList").innerHTML = wins.map(w=>`
      <article class="win-card">
        <div class="win-icon">✅</div>
        <div class="win-main"><b>${w[0]}</b><small>${w[1]}</small></div>
        <div class="win-odd">${w[2]}</div>
      </article>
    `).join("");
  }

  // ── BÜLTEN VIEW ──────────────────────────────────────
  function renderBulletin(filterTrack){
    const meta = (window.KHELL_RACES && window.KHELL_RACES._meta)
               || (window.KhellParser && window.KhellParser._lastMeta)
               || {};
    const dateEl = q("bulletinDate");
    if(dateEl) dateEl.textContent = meta.date || races[0]?.time && new Date().toLocaleDateString("tr-TR") || "--";

    // Pist listesini races'den çıkar
    const tracks = [...new Set(races.map(r => r.track || "").filter(Boolean))];

    // Filtre butonları
    const filterEl = q("bulletinFilters");
    if(filterEl){
      const active = filterTrack || "Tümü";
      filterEl.innerHTML = ["Tümü", ...tracks].map(t =>
        `<button class="bul-filter-btn ${t === active ? "bul-filter-active" : ""}"
          onclick="window.khellBulletinFilter('${t}')">${t}</button>`
      ).join("");
    }

    // Koşuları filtrele
    const filtered = filterTrack && filterTrack !== "Tümü"
      ? races.filter(r => (r.track || "") === filterTrack)
      : races;

    const contentEl = q("bulletinContent");
    if(!contentEl) return;

    if(filtered.length === 0){
      contentEl.innerHTML = `<p class="bul-empty">Gösterilecek koşu bulunamadı.</p>`;
      return;
    }

    contentEl.innerHTML = filtered.map((r, ri) => {
      // allAnalyses içinde bu koşuyu bul (raceName eşleşmesi)
      const analysisIdx = allAnalyses.findIndex(a => a.raceName === r.raceName);
      const horseCount  = Array.isArray(r.horses) ? r.horses.length : 0;
      const surface     = r.surface || "çim";
      const surfCls     = surface === "çim" ? "bul-surf-cim" : surface === "kum" ? "bul-surf-kum" : "bul-surf-other";

      return `
      <div class="bul-card">
        <div class="bul-card-top">
          <div class="bul-race-num">${ri + 1}</div>
          <div class="bul-race-info">
            <div class="bul-race-name">${r.raceName || `${ri+1}. Koşu`}</div>
            <div class="bul-race-meta">
              <span class="bul-chip">🕐 ${r.time || "--:--"}</span>
              <span class="bul-chip">📍 ${r.track || "-"}</span>
              <span class="bul-chip bul-dist">📏 ${r.distance || "-"}m</span>
              <span class="bul-chip ${surfCls}">⬛ ${surface}</span>
              <span class="bul-chip">🏷 ${r.type || "-"}</span>
            </div>
          </div>
        </div>
        <div class="bul-card-bottom">
          <span class="bul-horse-count">
            ${horseCount > 0
              ? `🐴 ${horseCount} at`
              : `<span class="bul-no-horses">At listesi henüz yüklenmedi</span>`}
          </span>
          ${analysisIdx >= 0 && horseCount > 0
            ? `<button class="bul-analyze-btn" onclick="openDetail(${analysisIdx})">Analize Git →</button>`
            : `<span class="bul-no-analysis">—</span>`}
        </div>
      </div>`;
    }).join("");
  }

  window.khellBulletinFilter = function(track){
    renderBulletin(track === "Tümü" ? null : track);
  };

  function setupNav(){
    document.querySelectorAll(".nav-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".view").forEach(v=>v.classList.remove("view-active"));
        q(`view-${btn.dataset.view}`).classList.add("view-active");
        window.scrollTo({top:0,behavior:"smooth"});
        if(btn.dataset.view === "bulletin") renderBulletin();
      });
    });
  }

  function setupCouponTabs(){
    document.querySelectorAll(".tab-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        renderCoupon(btn.dataset.coupon);
      });
    });
  }

  function setupWhatsApp(){
    const base = moneyLink("KHELL VIP bilgi istiyorum");
    q("stickyWa").href = base;
    q("waDaily").href = moneyLink("KHELL Günlük VIP almak istiyorum");
    q("waWeekly").href = moneyLink("KHELL Haftalık VIP almak istiyorum");
    q("waMonthly").href = moneyLink("KHELL Aylık Telegram VIP almak istiyorum");
  }

  function exactaText(){
    const x = analysis.bestExacta;
    return x ? `${x.first} → ${x.second}` : "2 → 3";
  }
  function riskText(score){ return score >= 82 ? "DÜŞÜK" : score >= 65 ? "ORTA" : "YÜKSEK"; }
  function riskClass(score){ return score >= 82 ? "risk-low" : score >= 65 ? "risk-mid" : "risk-high"; }
  function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
})();
