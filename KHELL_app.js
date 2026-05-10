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
      surface: (r.surface || "ÇİM").toString().toUpperCase(),
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

  function openDetail(idx){
    const a = allAnalyses[idx];
    if(!a) return;
    const horses = (a.horses || [])
      .filter(isValidHorse)
      .map(h => ({
        ...h,
        number: resolveHorseNum(h),
        name: resolveHorseName(h),
        formScore: h.formScore || 70,
        surpriseScore: h.surpriseScore || 70,
        riskScore: h.riskScore || 35,
        odds: h.odds || "-"
      }));
    const pickNo = a.hiddenBomb?.horseNumber;
    const bombH = horses.find(h => h.number == pickNo) || horses[0];
    const raceRisk = riskText(a.hiddenBomb?.surpriseScore || 70);
    const raceRiskCls = riskClass(a.hiddenBomb?.surpriseScore || 70);
    const hasValue = bombH && bombH.odds > 8;
    const sc = a.hiddenBomb?.surpriseScore || 70;
    const khellNote = sc >= 85
      ? "Son performansı yükselişte. Oranına göre güçlü görünüyor."
      : sc >= 70
      ? "Oranına göre değerli görünüyor. Dikkatle takip edilmeli."
      : "Favori baskısı altında. Risk yönetimi önemli.";
    q("modalContent").innerHTML = `
      <h2 class="coupon-title">${a.raceName}</h2>
      <div class="modal-section">
        <div class="modal-section-title">KHELL ANALİZ ÖZETİ</div>
        <div class="modal-metrics">
          <div class="modal-metric gold"><small>SÜRPRİZ</small><b>${a.hiddenBomb?.surpriseScore || 70}</b></div>
          <div class="modal-metric ${raceRiskCls === 'risk-low' ? 'green' : raceRiskCls === 'risk-mid' ? 'orange' : 'red'}"><small>RİSK</small><b>${raceRisk}</b></div>
          <div class="modal-metric"><small>AT SAYISI</small><b>${horses.length}</b></div>
          <div class="modal-metric gold"><small>ORAN</small><b>${bombH?.odds || "-"}</b></div>
        </div>
        <div class="khell-note">
          <b>KHELL notu:</b> ${khellNote}
        </div>
        ${hasValue ? `<div class="value-alert">⚡ Değerli oran uyarısı — ${bombH.odds} oranı potansiyele göre yüksek görünüyor.</div>` : ""}
      </div>
      <div class="horse-table">
        ${horses.map(h=>`
          <div class="horse-row ${h.number == pickNo ? "pick" : ""}">
            <div class="horse-num">${h.number}</div>
            <div class="horse-name"><b>${h.name}</b><small>${h.jockey || "Jokey"} • Oran ${h.odds}</small></div>
            <div class="metric"><small>FORM</small><b>${h.formScore}</b></div>
            <div class="metric"><small>SÜRPRİZ</small><b>${h.surpriseScore}</b></div>
            <div class="metric"><small>RİSK</small><b>${h.riskScore}</b></div>
            <div class="metric"><small>AGF</small><b>${h.agf || "-"}</b></div>
          </div>
        `).join("")}
      </div>
    `;
    modalOpen();
  }

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

  // copyTexts modül seviyesinde — closure sorunu olmaz
  const couponCopyTexts = {};

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

  function setupNav(){
    document.querySelectorAll(".nav-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".view").forEach(v=>v.classList.remove("view-active"));
        q(`view-${btn.dataset.view}`).classList.add("view-active");
        window.scrollTo({top:0,behavior:"smooth"});
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
