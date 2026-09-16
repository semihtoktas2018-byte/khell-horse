/**
 * KHELL Horse Engine v2.5
 * Browser native, window.KhellEngine korunuyor.
 */

function safeNumber(value, fallback) {
    if (fallback === undefined) fallback = 0;
    var num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? fallback : num;
}
function safeArray(value) { return Array.isArray(value) ? value : []; }
function normalize(value, min, max) {
    if (min === undefined) min = 0;
    if (max === undefined) max = 100;
    return Math.min(max, Math.max(min, Math.round(safeNumber(value))));
}

function calculateFormScore(horse) {
    var runs = safeArray(horse.lastRuns).slice(0, 5);
    if (runs.length === 0) return 50;
    var baseScore = 0;
    for (var i = 0; i < runs.length; i++) {
        var pos = runs[i];
        if (pos === 1) baseScore += 20;
        else if (pos === 2) baseScore += 15;
        else if (pos === 3) baseScore += 12;
        else if (pos === 4) baseScore += 8;
        else if (pos === 5) baseScore += 5;
        else baseScore += 2;
    }
    var momentumBonus = 0;
    if (runs.length >= 3) {
        var improvements = 0;
        for (var j = 1; j < 3; j++) { if (runs[j] < runs[j-1]) improvements++; }
        momentumBonus = improvements * 10;
        if (runs[0] <= 3) momentumBonus += 8;
    }
    var top3 = runs.filter(function(p){ return p <= 3; }).length;
    return normalize(baseScore + momentumBonus + top3 * 4);
}

function calculateMomentumScore(horse) {
    var runs = safeArray(horse.lastRuns).slice(0, 5);
    if (runs.length < 2) return 50;
    var trendScore = 50, improvements = 0, declines = 0;
    for (var i = 1; i < Math.min(4, runs.length); i++) {
        if (runs[i] < runs[i-1]) improvements++;
        else if (runs[i] > runs[i-1]) declines++;
    }
    if (improvements >= 2) trendScore = 85;
    else if (improvements >= 1) trendScore = 70;
    if (declines >= 2) trendScore = 25;
    else if (declines >= 1 && improvements === 0) trendScore = 45;
    if (runs[0] === 1) trendScore += 12;
    else if (runs[0] === 2) trendScore += 7;
    else if (runs[0] >= 6) trendScore -= 10;
    if (runs.length >= 3 && runs[0] < runs[1] && runs[1] < runs[2]) trendScore += 15;
    return normalize(trendScore);
}

function calculateSurfaceScore(horse) {
    var surface = (horse.surface || 'çim').toLowerCase();
    var preferred = (horse.preferredSurface || surface).toLowerCase();
    if (surface === preferred) return 100;
    var m = { 'çim':{'sentetik':40,'kum':30,'çim':100}, 'kum':{'sentetik':50,'çim':30,'kum':100}, 'sentetik':{'kum':50,'çim':40,'sentetik':100} };
    return (m[surface] && m[surface][preferred]) || 40;
}

function calculateDistanceScore(horse) {
    var d = safeNumber(horse.distance, 1400);
    var min = safeNumber(horse.preferredDistanceMin, d - 200);
    var max = safeNumber(horse.preferredDistanceMax, d + 200);
    if (d >= min && d <= max) return 100;
    if (d >= min-100 && d <= max+100) return 70;
    if (d >= min-200 && d <= max+200) return 40;
    return 20;
}

function calculateWeightScore(horse, raceHorses) {
    var hw = safeNumber(horse.weight, 55);
    var others = safeArray(raceHorses).filter(function(h){ return h && h.number !== horse.number; }).map(function(h){ return safeNumber(h.weight, 55); });
    if (others.length === 0) return 50;
    var avg = others.reduce(function(a,b){ return a+b; }, 0) / others.length;
    return normalize(50 + (avg - hw) * 4);
}

function calculateJockeyScore(horse) {
    var jr = safeNumber(horse.jockeyWinRate, 10);
    var tr = safeNumber(horse.trainerWinRate, 10);
    var score = (jr * 0.6) + (tr * 0.4);
    if (jr >= 22) score += 10;
    else if (jr >= 18) score += 6;
    return normalize(score);
}

function calculateAGFValueScore(horse, raceHorses) {
    var agf = safeNumber(horse.agf, 5);
    var form = calculateFormScore(horse);
    var surf = calculateSurfaceScore(horse);
    var dist = calculateDistanceScore(horse);
    var agfBonus = agf >= 1 && agf <= 3 ? 30 : agf <= 5 ? 20 : agf <= 8 ? 10 : 0;
    return normalize(((surf + dist) / 2 * 0.5) + (form * 0.3) + agfBonus);
}

function calculateOddsValueScore(horse) {
    var odds = safeNumber(horse.odds, 10);
    var form = calculateFormScore(horse);
    var trackFit = (calculateSurfaceScore(horse) + calculateDistanceScore(horse)) / 2;
    var v = odds >= 8 && odds < 15 ? 95 : odds >= 15 && odds <= 25 ? 85 : odds >= 5 && odds < 8 ? 60 : odds >= 25 && odds <= 40 ? 55 : odds < 3 ? 25 : odds > 40 ? 30 : 50;
    if (trackFit > 70 && odds > 6) v += 10;
    if (form > 70 && odds > 8) v += 10;
    return normalize(v);
}

function calculateRiskScore(horse) {
    var risk = 0;
    var odds = safeNumber(horse.odds, 15);
    var form = calculateFormScore(horse);
    if (odds > 35) risk += 30; else if (odds > 20) risk += 18; else if (odds < 2.5) risk += 28; else if (odds < 3) risk += 20;
    if (form < 40) risk += 28; else if (form < 55) risk += 12;
    if (calculateSurfaceScore(horse) < 40) risk += 22;
    if (calculateDistanceScore(horse) < 40) risk += 16;
    if (safeNumber(horse.weight, 55) > 60) risk += 10;
    return normalize(risk);
}

function calculateFavoriteRiskScore(horse, raceHorses) {
    if (!horse.isFavorite && safeNumber(horse.odds, 99) > 5) return 0;
    var risk = 0;
    var form = calculateFormScore(horse);
    var momentum = calculateMomentumScore(horse);
    if (form < 50) risk += 35; else if (form < 65) risk += 18;
    if (calculateSurfaceScore(horse) < 50) risk += 25;
    if (calculateDistanceScore(horse) < 50) risk += 20;
    if (momentum < 40) risk += 20; else if (momentum < 55) risk += 10;
    if (safeNumber(horse.odds, 5) < 2) risk += 15;
    var rivals = safeArray(raceHorses).filter(function(h){ return h.number !== horse.number && safeNumber(h.odds,99) >= 6 && calculateMomentumScore(h) >= 70; });
    if (rivals.length >= 2) risk += 15;
    return normalize(risk);
}

function calculateSurpriseScore(horse, raceHorses) {
    var score = 0;
    var momentum = calculateMomentumScore(horse);
    var odds = safeNumber(horse.odds, 99);
    score += calculateOddsValueScore(horse) * 0.22;
    score += momentum * 0.22;
    score += calculateAGFValueScore(horse, raceHorses) * 0.18;
    score += ((calculateSurfaceScore(horse) + calculateDistanceScore(horse)) / 2) * 0.18;
    score += calculateWeightScore(horse, raceHorses) * 0.10;
    score += calculateJockeyScore(horse) * 0.10;
    if (!horse.isFavorite) score += 8;
    if (calculateFavoriteRiskScore(horse, raceHorses) < 30) score += 5;
    if (odds >= 8 && odds <= 20 && momentum >= 75) score += 10;
    return normalize(score);
}

function calculateValueScore(horse, raceHorses) {
    return normalize((calculateOddsValueScore(horse) * 0.40) + (calculateAGFValueScore(horse, raceHorses) * 0.30) + (calculateSurpriseScore(horse, raceHorses) * 0.30));
}

function calculateConfidenceScore(horse, raceHorses) {
    return normalize((calculateFormScore(horse)*0.30) + (calculateSurfaceScore(horse)*0.20) + (calculateDistanceScore(horse)*0.20) + (calculateJockeyScore(horse)*0.20) + ((100-calculateRiskScore(horse))*0.10));
}

function calculateOverallScore(horse, raceHorses) {
    return normalize((calculateFormScore(horse)*0.30) + (calculateSurfaceScore(horse)*0.20) + (calculateDistanceScore(horse)*0.20) + (calculateWeightScore(horse,raceHorses)*0.15) + (calculateJockeyScore(horse)*0.15));
}

function generateKhellNote(horse, raceHorses) {
    var form = calculateFormScore(horse);
    var momentum = calculateMomentumScore(horse);
    var surf = calculateSurfaceScore(horse);
    var dist = calculateDistanceScore(horse);
    var surprise = calculateSurpriseScore(horse, raceHorses);
    var risk = calculateRiskScore(horse);
    var odds = safeNumber(horse.odds, 10);
    var agf = safeNumber(horse.agf, 5);
    var runs = safeArray(horse.lastRuns);
    if (runs.length >= 3 && runs[0] < runs[1] && runs[1] < runs[2] && odds > 5) return "Son 3 koşuda sürekli yükseliş — KHELL form ivmesini izliyor.";
    if (surprise > 80 && odds >= 8 && odds <= 22) return "KHELL bu atta güçlü sürpriz+değer kombinasyonu görüyor.";
    if (odds >= 6 && odds <= 25 && form > 65) return "Oran/form dengesi olumlu — KHELL değerli aday olarak izliyor.";
    if (agf >= 1 && agf <= 4 && form > 60 && !horse.isFavorite) return "AGF düşük ama form iyi — KHELL gizli değer sinyali görüyor.";
    if (surf >= 90 && dist >= 90 && odds > 4) return "Pist ve mesafe uyumu mükemmel — koşu koşulları bu at için ideal.";
    if (horse.isFavorite && risk > 55) return "KHELL bu favoride risk görüyor — beklentiyi karşılamayabilir.";
    if (momentum < 35) return "Form grafiği düşüyor — KHELL bu koşuda temkinli yaklaşıyor.";
    if (form > 72) return "Formda görünüyor, KHELL olumlu değerlendiriyor.";
    return "KHELL analiz etti — standart performans beklentisi içinde.";
}

function calculateRaceChaosScore(race) {
    var horses = safeArray(race.horses);
    if (horses.length < 3) return 0;
    var chaos = 0;
    horses.filter(function(h){ return h.isFavorite; }).forEach(function(f){ if (calculateFavoriteRiskScore(f, horses) > 60) chaos += 30; });
    var odds = horses.map(function(h){ return safeNumber(h.odds,20); }).filter(function(o){ return o > 0; });
    if (odds.length > 1) { var avg = odds.reduce(function(a,b){return a+b;},0)/odds.length; if (odds.filter(function(o){return Math.abs(o-avg)<avg*0.3;}).length >= 3) chaos += 25; }
    if (horses.filter(function(h){ return calculateValueScore(h,horses) > 70; }).length >= 2) chaos += 25;
    if (horses.filter(function(h){ return calculateSurpriseScore(h,horses) > 70; }).length >= 2) chaos += 20;
    return normalize(chaos);
}

function generateRaceNote(race, chaosScore, favoriteRisk) {
    if (chaosScore > 75) return "🌪️ Kaos koşusu uyarısı — sonuç tahmin edilmesi güç.";
    if (chaosScore > 55) return "⚡ Dengeli dağılım — sürpriz ihtimali yüksek.";
    if (favoriteRisk && safeNumber(favoriteRisk.riskScore,0) > 60) return "⚠️ Riskli favori — alternatif adaylar değerlendirilmeli.";
    return "✅ KHELL analiz tamamlandı.";
}

function analyzeRace(race) {
    if (!race.horses || race.horses.length === 0) return { error: "Yarış verisi bulunamadı", raceName: race.raceName || "Bilinmeyen Koşu" };
    var rh = race.horses;
    var analyzed = [];
    for (var i = 0; i < rh.length; i++) {
        var h = rh[i];
        analyzed.push({
            number:h.number, name:h.name, jockey:h.jockey, weight:h.weight, age:h.age,
            odds:h.odds, agf:h.agf, lastRuns:safeArray(h.lastRuns),
            surface:h.surface, preferredSurface:h.preferredSurface,
            distance:h.distance, preferredDistanceMin:h.preferredDistanceMin, preferredDistanceMax:h.preferredDistanceMax,
            isFavorite:h.isFavorite, jockeyWinRate:h.jockeyWinRate, trainerWinRate:h.trainerWinRate,
            overallScore:calculateOverallScore(h,rh), formScore:calculateFormScore(h),
            momentumScore:calculateMomentumScore(h), surpriseScore:calculateSurpriseScore(h,rh),
            riskScore:calculateRiskScore(h), surfaceScore:calculateSurfaceScore(h),
            distanceScore:calculateDistanceScore(h), weightScore:calculateWeightScore(h,rh),
            jockeyScore:calculateJockeyScore(h), valueScore:calculateValueScore(h,rh),
            confidenceScore:calculateConfidenceScore(h,rh), favoriteRiskScore:calculateFavoriteRiskScore(h,rh),
            agfValueScore:calculateAGFValueScore(h,rh), khellNote:generateKhellNote(h,rh)
        });
    }
    var byScore    = analyzed.slice().sort(function(a,b){return b.overallScore-a.overallScore;});
    var bySurprise = analyzed.slice().sort(function(a,b){return b.surpriseScore-a.surpriseScore;});
    var byValue    = analyzed.slice().sort(function(a,b){return b.valueScore-a.valueScore;});
    var byOdds     = rh.slice().sort(function(a,b){return safeNumber(a.odds,999)-safeNumber(b.odds,999);});
    var fav = rh.find(function(h){return h.isFavorite===true;}) || byOdds[0];
    var favRisk = null;
    if (fav) {
        var favA = analyzed.find(function(h){return h.number===fav.number;});
        var frs = calculateFavoriteRiskScore(fav, rh);
        if (frs > 50) favRisk = { horseNumber:fav.number, horseName:fav.name, odds:fav.odds, riskScore:frs, riskReason:"KHELL risk görüyor — favori beklentiyi karşılamayabilir", khellNote:favA?favA.khellNote:"" };
    }
    var bomb = null;
    var bc = bySurprise.filter(function(h){return h.surpriseScore>70&&h.valueScore>65&&h.riskScore<60;});
    if (bc.length > 0) {
        var b = bc[0]; var bo = rh.find(function(h){return h.number===b.number;});
        bomb = { horseNumber:b.number, horseName:bo?bo.name:b.name, odds:bo?bo.odds:b.odds, surpriseScore:b.surpriseScore, valueScore:b.valueScore, momentumScore:b.momentumScore, comment:"KHELL günün gizli bombası olarak işaretledi — güçlü sürpriz+değer kombinasyonu" };
    } else if (bySurprise[0] && bySurprise[0].surpriseScore > 65) {
        var b2 = bySurprise[0]; var b2o = rh.find(function(h){return h.number===b2.number;});
        bomb = { horseNumber:b2.number, horseName:b2o?b2o.name:b2.name, odds:b2o?b2o.odds:b2.odds, surpriseScore:b2.surpriseScore, valueScore:b2.valueScore, momentumScore:b2.momentumScore, comment:"KHELL fırsat işaretledi — güçlü sürpriz potansiyeli" };
    }
    var vp = null;
    var vc = byValue.filter(function(h){ var o=rh.find(function(r){return r.number===h.number;}); var od=o?safeNumber(o.odds,0):0; return h.valueScore>70&&od>=4&&od<=35; });
    if (vc.length > 0) { var v=vc[0]; var vo=rh.find(function(h){return h.number===v.number;}); vp={horseNumber:v.number,horseName:vo?vo.name:v.name,odds:vo?vo.odds:v.odds,valueScore:v.valueScore,comment:"KHELL değerli ganyan olarak işaretledi"}; }
    var chaos = calculateRaceChaosScore(race);
    var note  = generateRaceNote(race, chaos, favRisk);
    function orig(num){ return rh.find(function(h){return h.number===num;})||{}; }
    var safe     = byScore.slice(0,2).map(function(h){ var o=orig(h.number); return {horseNumber:h.number,horseName:o.name||h.name,odds:o.odds||h.odds,overallScore:h.overallScore,confidenceScore:h.confidenceScore}; });
    var balArr   = []; if(byScore[0])balArr.push(byScore[0]); if(bySurprise[0]&&bySurprise[0].number!==(byScore[0]||{}).number)balArr.push(bySurprise[0]); if(balArr.length<2&&byScore[1])balArr.push(byScore[1]);
    var balanced = balArr.map(function(h){ var o=orig(h.number); return {horseNumber:h.number,horseName:o.name||h.name,odds:o.odds||h.odds}; });
    var surprise = bySurprise.slice(0,2).map(function(h){ var o=orig(h.number); return {horseNumber:h.number,horseName:o.name||h.name,odds:o.odds||h.odds,surpriseScore:h.surpriseScore,valueScore:h.valueScore}; });
    var exacta   = [];
    if(byScore[0]&&bySurprise[0]&&byScore[0].number!==bySurprise[0].number) exacta.push({first:byScore[0].number,second:bySurprise[0].number,potential:Math.min(100,(byScore[0].overallScore+bySurprise[0].surpriseScore)/2),type:"güvenli+sürpriz"});
    if(byValue[0]&&byScore[1]&&byValue[0].number!==byScore[1].number) exacta.push({first:byScore[1].number,second:byValue[0].number,potential:75,type:"değer+form"});
    var tabela   = byScore.slice(0,4).map(function(h){ var o=orig(h.number); return {horseNumber:h.number,horseName:o.name||h.name,odds:o.odds||h.odds,tabelaScore:h.confidenceScore||h.overallScore,confidenceScore:h.confidenceScore}; });
    var triple   = [];
    if(byScore[0]) triple.push({horseNumber:byScore[0].number,horseName:orig(byScore[0].number).name||byScore[0].name,tripleScore:byScore[0].confidenceScore||byScore[0].overallScore,type:"güçlü"});
    if(byScore[1]&&byScore[1].momentumScore>60) triple.push({horseNumber:byScore[1].number,horseName:orig(byScore[1].number).name||byScore[1].name,tripleScore:byScore[1].momentumScore,type:"form"});
    if(bySurprise[0]&&!triple.find(function(c){return c.horseNumber===bySurprise[0].number;})) triple.push({horseNumber:bySurprise[0].number,horseName:orig(bySurprise[0].number).name||bySurprise[0].name,tripleScore:bySurprise[0].surpriseScore,type:"sürpriz"});
    var comment = note;
    if(bomb&&comment.indexOf("gizli bomba")<0) comment="💣 "+bomb.comment+" | "+note;
    else if(vp&&comment.indexOf("değerli")<0) comment="💰 "+vp.comment+" | "+note;
    return { raceName:race.raceName, horses:analyzed, hiddenBomb:bomb, valuePick:vp, favoriteRisk:favRisk, safeCoupon:safe, balancedCoupon:balanced, surpriseCoupon:surprise, exactaCandidates:exacta.slice(0,3), tabelaCandidates:tabela, tripleCandidates:triple, khellComment:comment, raceChaosScore:chaos, raceNote:note, topValueHorses:byValue.slice(0,2).map(function(h){return{number:h.number,name:h.name,valueScore:h.valueScore};}), topSurpriseHorses:bySurprise.slice(0,2).map(function(h){return{number:h.number,name:h.name,surpriseScore:h.surpriseScore};}) };
}

function analyzeAllRaces(races) {
    if (!races||races.length===0) return {error:"Yarış verisi bulunamadı",totalRaces:0};
    var ra=[],bomb=null,vp=null,ex=null,tab=null,tri=null,rf=null,cr=null,rfs=[];
    for(var i=0;i<races.length;i++){
        var a=analyzeRace(races[i]); ra.push(a);
        if(a.hiddenBomb&&(!bomb||a.hiddenBomb.surpriseScore>bomb.surpriseScore)) bomb=Object.assign({},a.hiddenBomb,{raceName:a.raceName});
        if(a.valuePick&&(!vp||safeNumber(a.valuePick.valueScore)>safeNumber(vp.valueScore))) vp=Object.assign({},a.valuePick,{raceName:a.raceName});
        if(a.exactaCandidates&&a.exactaCandidates.length>0){var be=a.exactaCandidates[0];if(!ex||safeNumber(be.potential)>safeNumber(ex.potential))ex={raceName:a.raceName,first:be.first,second:be.second,potential:be.potential};}
        if(a.tabelaCandidates&&a.tabelaCandidates.length>0){var bt=a.tabelaCandidates[0];if(!tab||safeNumber(bt.tabelaScore)>safeNumber(tab.score))tab={raceName:a.raceName,horseNumber:bt.horseNumber,horseName:bt.horseName,odds:bt.odds,score:bt.tabelaScore};}
        if(a.tripleCandidates&&a.tripleCandidates.length>=2&&!tri) tri={raceName:a.raceName,horses:a.tripleCandidates.slice(0,3).map(function(c){return c.horseNumber+" - "+c.horseName;}),score:a.tripleCandidates.reduce(function(s,c){return s+safeNumber(c.tripleScore,70);},0)/3};
        if(a.favoriteRisk){rfs.push(Object.assign({raceName:a.raceName},a.favoriteRisk));if(!rf||safeNumber(a.favoriteRisk.riskScore)>safeNumber(rf.riskScore))rf=Object.assign({raceName:a.raceName},a.favoriteRisk);}
        if(safeNumber(a.raceChaosScore)>70&&(!cr||safeNumber(a.raceChaosScore)>safeNumber(cr.chaosScore)))cr={raceName:a.raceName,chaosScore:a.raceChaosScore,note:a.raceNote};
    }
    var day="🔍 KHELL günlük analiz tamamlandı. ";
    if(bomb) day+="💣 Günün gizli bombası: "+bomb.raceName+" koşusunda "+bomb.horseName+" (oran "+bomb.odds+"). ";
    if(vp)   day+="💰 En değerli ganyan: "+vp.raceName+" koşusunda "+vp.horseName+". ";
    if(rf)   day+="⚠️ En riskli favori: "+rf.raceName+" koşusunda "+rf.horseName+". ";
    if(cr)   day+="🌪️ Kaos koşusu uyarısı: "+cr.raceName+". ";
    if(rfs.length>0) day+=rfs.length+" koşuda favori riski tespit edildi.";
    return { totalRaces:races.length, raceAnalyses:ra, bestHiddenBomb:bomb, bestValuePick:vp, bestExacta:ex, bestTabela:tab, bestTriple:tri, riskyFavorites:rfs, riskiestFavorite:rf, chaosRace:cr, daySummary:day, khellDaySummary:day, statistics:{ totalHorses:ra.reduce(function(s,r){return s+(r.horses?r.horses.length:0);},0), avgChaosScore:normalize(ra.reduce(function(s,r){return s+safeNumber(r.raceChaosScore);},0)/Math.max(1,ra.length)), totalBombs:ra.filter(function(r){return r.hiddenBomb;}).length, totalValuePicks:ra.filter(function(r){return r.valuePick;}).length, totalRiskyFavorites:rfs.length } };
}

if(typeof module!=='undefined'&&module.exports){ module.exports={calculateFormScore,calculateMomentumScore,calculateSurfaceScore,calculateDistanceScore,calculateWeightScore,calculateJockeyScore,calculateAGFValueScore,calculateOddsValueScore,calculateRiskScore,calculateFavoriteRiskScore,calculateSurpriseScore,calculateValueScore,calculateConfidenceScore,calculateOverallScore,calculateRaceChaosScore,generateKhellNote,generateRaceNote,analyzeRace,analyzeAllRaces}; }

if(typeof window!=='undefined'){ window.KhellEngine={analyzeRace:analyzeRace,analyzeAllRaces:analyzeAllRaces,version:"2.5"}; window.KHELL_ENGINE=window.KhellEngine; console.log("✅ KHELL Horse Engine v2.5 yüklendi"); }
