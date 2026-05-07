/**
 * KHELL Horse Engine - GELİŞTİRİLMİŞ SÜRÜM
 * At Yarışı Analiz Motoru - Risk ve Fırsat Analizi
 * Versiyon: 2.0
 * 
 * YENİ ÖZELLİKLER:
 * - Momentum skoru (yükselen/düşen form)
 * - Kaos koşusu analizi
 * - KHELL akıllı notlar
 * - Gelişmiş sürpriz tespiti
 * - Canlı veri uyumlu (fallback sistemi)
 */

// ==================== FALLBACK ve YARDIMCI FONKSİYONLAR ====================

/**
 * Güvenli sayı okuma - undefined/null durumunda fallback değer döndürür
 */
function safeNumber(value, fallback = 0) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? fallback : num;
}

/**
 * Güvenli array okuma
 */
function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

/**
 * Normalize et (0-100 arası)
 */
function normalize(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, Math.round(safeNumber(value))));
}

// ==================== TEMEL SKOR FONKSİYONLARI (GELİŞTİRİLMİŞ) ====================

/**
 * 1. Form Momentum Skoru (0-100)
 * Son yarışlara göre yükselen/düşen trend
 */
function calculateFormScore(horse) {
    const runs = safeArray(horse.lastRuns).slice(0, 5);
    if (runs.length === 0) return 50;
    
    let baseScore = 0;
    
    // Derece puanlaması
    for (let i = 0; i < runs.length; i++) {
        const pos = runs[i];
        if (pos === 1) baseScore += 20;
        else if (pos === 2) baseScore += 15;
        else if (pos === 3) baseScore += 12;
        else if (pos === 4) baseScore += 8;
        else if (pos === 5) baseScore += 5;
        else baseScore += 2;
    }
    
    // Momentum hesaplama (son 3 yarış trendi)
    let momentumBonus = 0;
    if (runs.length >= 3) {
        let improvements = 0;
        for (let i = 1; i < 3; i++) {
            if (runs[i] < runs[i-1]) improvements++;
        }
        momentumBonus = improvements * 10;
        
        // Son yarış bonusu
        if (runs[0] <= 3) momentumBonus += 8;
    }
    
    // İlk 3 istikrarı
    const top3Count = runs.filter(p => p <= 3).length;
    const consistencyBonus = top3Count * 4;
    
    let finalScore = baseScore + momentumBonus + consistencyBonus;
    
    return normalize(finalScore);
}

/**
 * 1.1 Momentum Skoru (ayrı - trend analizi)
 */
function calculateMomentumScore(horse) {
    const runs = safeArray(horse.lastRuns).slice(0, 5);
    if (runs.length < 2) return 50;
    
    let trendScore = 50;
    let improvements = 0;
    let declines = 0;
    
    for (let i = 1; i < Math.min(4, runs.length); i++) {
        if (runs[i] < runs[i-1]) improvements++;
        else if (runs[i] > runs[i-1]) declines++;
    }
    
    // Yükselen trend
    if (improvements >= 2) trendScore = 85;
    else if (improvements >= 1) trendScore = 70;
    
    // Düşen trend
    if (declines >= 2) trendScore = 30;
    else if (declines >= 1) trendScore = 50;
    
    // Son yarış çok iyiyse ekstra
    if (runs[0] === 1) trendScore += 10;
    else if (runs[0] === 2) trendScore += 5;
    
    return normalize(trendScore);
}

/**
 * 2. Pist Uyum Skoru (geliştirilmiş)
 */
function calculateSurfaceScore(horse) {
    const surface = horse.surface || 'çim';
    const preferred = horse.preferredSurface || surface;
    
    if (surface === preferred) return 100;
    
    const matchMatrix = {
        'çim': { 'sentetik': 40, 'kum': 30, 'çim': 100 },
        'kum': { 'sentetik': 50, 'çim': 30, 'kum': 100 },
        'sentetik': { 'kum': 50, 'çim': 40, 'sentetik': 100 }
    };
    
    return matchMatrix[surface]?.[preferred] || 40;
}

/**
 * 3. Mesafe Uyum Skoru (geliştirilmiş)
 */
function calculateDistanceScore(horse) {
    const distance = safeNumber(horse.distance, 1400);
    const minDist = safeNumber(horse.preferredDistanceMin, distance - 200);
    const maxDist = safeNumber(horse.preferredDistanceMax, distance + 200);
    
    if (distance >= minDist && distance <= maxDist) return 100;
    if (distance >= minDist - 100 && distance <= maxDist + 100) return 70;
    if (distance >= minDist - 200 && distance <= maxDist + 200) return 40;
    
    return 20;
}

/**
 * 4. Kilo Avantaj Skoru (geliştirilmiş)
 */
function calculateWeightScore(horse, raceHorses) {
    const horseWeight = safeNumber(horse.weight, 55);
    const otherWeights = safeArray(raceHorses)
        .filter(h => h?.number !== horse.number)
        .map(h => safeNumber(h?.weight, 55));
    
    if (otherWeights.length === 0) return 50;
    
    const avgWeight = otherWeights.reduce((a, b) => a + b, 0) / otherWeights.length;
    const weightDiff = avgWeight - horseWeight;
    
    let score = 50 + (weightDiff * 4);
    
    return normalize(score);
}

/**
 * 5. Jokey Etki Skoru (geliştirilmiş)
 */
function calculateJockeyScore(horse) {
    const jockeyRate = safeNumber(horse.jockeyWinRate, 10);
    const trainerRate = safeNumber(horse.trainerWinRate, 10);
    
    let score = (jockeyRate * 0.6) + (trainerRate * 0.4);
    
    // Jokey ismi bonusu (iyi jokeyler için)
    const goodJockeys = ['A. Demir', 'M. Demir', 'H. Karataş', 'S. Kaya'];
    if (horse.jockey && goodJockeys.includes(horse.jockey)) {
        score += 8;
    }
    
    return normalize(score);
}

/**
 * 6. AGF Ters Fırsat Skoru
 * Düşük AGF + iyi form/pist = gizli değer
 */
function calculateAGFValueScore(horse, raceHorses) {
    const agf = safeNumber(horse.agf, 5);
    const formScore = calculateFormScore(horse);
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    
    // Düşük AGF avantajı (1-3 arası ideal)
    let agfBonus = 0;
    if (agf >= 1 && agf <= 3) agfBonus = 30;
    else if (agf > 3 && agf <= 5) agfBonus = 20;
    else if (agf > 5 && agf <= 8) agfBonus = 10;
    else if (agf > 8) agfBonus = 0;
    
    const trackFit = (surfaceScore + distanceScore) / 2;
    
    // AGF düşük ama uyum yüksekse değerli
    let valueScore = (trackFit * 0.5) + (formScore * 0.3) + agfBonus;
    
    return normalize(valueScore);
}

/**
 * 7. Oran Değeri Skoru (geliştirilmiş)
 */
function calculateOddsValueScore(horse) {
    const odds = safeNumber(horse.odds, 10);
    const formScore = calculateFormScore(horse);
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    
    const trackFit = (surfaceScore + distanceScore) / 2;
    
    let valueScore = 50;
    
    // Sürpriz altın bölge (8-25 arası)
    if (odds >= 8 && odds < 15) valueScore = 95;
    else if (odds >= 15 && odds <= 25) valueScore = 85;
    else if (odds >= 5 && odds < 8) valueScore = 60;
    else if (odds >= 25 && odds <= 40) valueScore = 55;
    else if (odds < 3) valueScore = 25;
    else if (odds > 40) valueScore = 35;
    
    // Form ve uyum iyiyse değer artar
    if (trackFit > 70 && odds > 6) valueScore += 10;
    if (formScore > 70 && odds > 8) valueScore += 10;
    
    return normalize(valueScore);
}

/**
 * 8. Riskli Favori Skoru
 */
function calculateFavoriteRiskScore(horse, raceHorses) {
    if (!horse.isFavorite && (horse.odds || 0) > 5) return 0;
    
    let riskScore = 0;
    const formScore = calculateFormScore(horse);
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    const odds = safeNumber(horse.odds, 5);
    
    // Form düşükse risk
    if (formScore < 50) riskScore += 35;
    else if (formScore < 65) riskScore += 20;
    
    // Pist uyumsuz
    if (surfaceScore < 50) riskScore += 25;
    
    // Mesafe uyumsuz
    if (distanceScore < 50) riskScore += 20;
    
    // Oran 2'nin altında değilse risk
    if (odds < 2) riskScore += 15;
    
    return normalize(riskScore);
}

/**
 * 9. Sürpriz At Skoru (geliştirilmiş)
 */
function calculateSurpriseScore(horse, raceHorses) {
    const oddsValue = calculateOddsValueScore(horse);
    const momentumScore = calculateMomentumScore(horse);
    const agfValue = calculateAGFValueScore(horse, raceHorses);
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    const weightScore = calculateWeightScore(horse, raceHorses);
    const favoriteRisk = calculateFavoriteRiskScore(horse, raceHorses);
    
    let surpriseScore = 0;
    surpriseScore += oddsValue * 0.25;
    surpriseScore += momentumScore * 0.20;
    surpriseScore += agfValue * 0.20;
    surpriseScore += ((surfaceScore + distanceScore) / 2) * 0.20;
    surpriseScore += weightScore * 0.10;
    
    // Favori değilse bonus
    if (!horse.isFavorite) surpriseScore += 8;
    
    // Risk düşükse bonus
    if (favoriteRisk < 30) surpriseScore += 5;
    
    return normalize(surpriseScore);
}

/**
 * 10. Güven Skoru (yeni)
 */
function calculateConfidenceScore(horse, raceHorses) {
    const formScore = calculateFormScore(horse);
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    const jockeyScore = calculateJockeyScore(horse);
    const riskScore = calculateRiskScore(horse);
    
    let confidence = (formScore * 0.30) +
                     (surfaceScore * 0.20) +
                     (distanceScore * 0.20) +
                     (jockeyScore * 0.20) +
                     ((100 - riskScore) * 0.10);
    
    return normalize(confidence);
}

/**
 * Risk Skoru (mevcut - geliştirilmiş)
 */
function calculateRiskScore(horse) {
    let riskScore = 0;
    const odds = safeNumber(horse.odds, 15);
    const formScore = calculateFormScore(horse);
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    const weight = safeNumber(horse.weight, 55);
    
    if (odds > 30) riskScore += 30;
    else if (odds > 15) riskScore += 15;
    else if (odds < 3) riskScore += 25;
    
    if (formScore < 40) riskScore += 25;
    else if (formScore < 60) riskScore += 10;
    
    if (surfaceScore < 40) riskScore += 20;
    if (distanceScore < 40) riskScore += 15;
    if (weight > 60) riskScore += 10;
    
    return normalize(riskScore);
}

/**
 * Value Score (özet)
 */
function calculateValueScore(horse, raceHorses) {
    const oddsValue = calculateOddsValueScore(horse);
    const agfValue = calculateAGFValueScore(horse, raceHorses);
    const surpriseScore = calculateSurpriseScore(horse, raceHorses);
    
    return normalize((oddsValue * 0.4) + (agfValue * 0.3) + (surpriseScore * 0.3));
}

/**
 * Genel Performans Skoru (mevcut - uyumlu)
 */
function calculateOverallScore(horse, raceHorses) {
    const formScore = calculateFormScore(horse);
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    const weightScore = calculateWeightScore(horse, raceHorses);
    const jockeyScore = calculateJockeyScore(horse);
    
    return normalize(
        (formScore * 0.30) +
        (surfaceScore * 0.20) +
        (distanceScore * 0.20) +
        (weightScore * 0.15) +
        (jockeyScore * 0.15)
    );
}

/**
 * KHELL Notu Üret
 */
function generateKhellNote(horse, raceHorses) {
    const formScore = calculateFormScore(horse);
    const momentum = calculateMomentumScore(horse);
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    const odds = safeNumber(horse.odds, 10);
    const agf = safeNumber(horse.agf, 5);
    const surpriseScore = calculateSurpriseScore(horse, raceHorses);
    const riskScore = calculateRiskScore(horse);
    
    // Sürpriz potansiyeli yüksekse
    if (surpriseScore > 75 && odds > 8) {
        return "KHELL fırsat işaretledi - Güçlü sürpriz potansiyeli!";
    }
    
    // Değerli oran
    if (odds >= 6 && odds <= 25 && formScore > 65) {
        return `KHELL değerli ganyan olarak görüyor (oran ${odds.toFixed(1)}).`;
    }
    
    // Form yükseliyor
    if (momentum > 75 && formScore > 60 && odds > 5) {
        return "Form grafiği yükseliyor, KHELL takipte.";
    }
    
    // Pist mesafe uyumu
    if (surfaceScore > 80 && distanceScore > 80) {
        return "Pist ve mesafe uyumu mükemmel.";
    }
    
    // AGF fırsatı
    if (agf >= 1 && agf <= 3 && formScore > 60) {
        return `AGF düşük (${agf}) ama form iyi - KHELL gizli değer görüyor.`;
    }
    
    // Risk uyarısı (favori)
    if (horse.isFavorite && riskScore > 60) {
        return "KHELL risk görüyor - Favori beklentiyi karşılamayabilir!";
    }
    
    // Genel olumlu
    if (formScore > 70) {
        return "Formda görünüyor, KHELL olumlu değerlendiriyor.";
    }
    
    return "KHELL analiz edildi, normal performans bekleniyor.";
}

// ==================== KOŞU ANALİZİ (GELİŞTİRİLMİŞ) ====================

/**
 * Kaos Koşusu Skoru
 */
function calculateRaceChaosScore(race) {
    const horses = safeArray(race.horses);
    if (horses.length < 3) return 0;
    
    let chaosScore = 0;
    
    // Riskli favori kontrolü
    const favorites = horses.filter(h => h.isFavorite === true);
    for (const fav of favorites) {
        const favRisk = calculateFavoriteRiskScore(fav, horses);
        if (favRisk > 60) chaosScore += 30;
    }
    
    // Oranların yakınlığı
    const odds = horses.map(h => safeNumber(h.odds, 20)).filter(o => o > 0);
    if (odds.length > 1) {
        const avgOdds = odds.reduce((a, b) => a + b, 0) / odds.length;
        const closeOdds = odds.filter(o => Math.abs(o - avgOdds) < avgOdds * 0.3).length;
        if (closeOdds >= 3) chaosScore += 25;
    }
    
    // Değerli at sayısı
    const valueHorses = horses.filter(h => calculateValueScore(h, horses) > 70);
    if (valueHorses.length >= 2) chaosScore += 25;
    
    // Sürpriz potansiyeli yüksek atlar
    const surpriseHorses = horses.filter(h => calculateSurpriseScore(h, horses) > 70);
    if (surpriseHorses.length >= 2) chaosScore += 20;
    
    return normalize(chaosScore);
}

/**
 * Koşu Notu
 */
function generateRaceNote(race, raceChaosScore, favoriteRisk) {
    const horses = safeArray(race.horses);
    const valueHorses = horses.filter(h => calculateValueScore(h, horses) > 70);
    const surpriseHorses = horses.filter(h => calculateSurpriseScore(h, horses) > 70);
    
    if (raceChaosScore > 70) {
        return "⚠️ KHELL kaos koşusu uyarısı - Beklenmedik sonuçlar olabilir!";
    }
    
    if (favoriteRisk && favoriteRisk.riskScore > 65) {
        return `⚠️ KHELL favori riski görüyor - ${favoriteRisk.horseName} için dikkat!`;
    }
    
    if (valueHorses.length >= 2) {
        return `KHELL bu koşuda ${valueHorses.length} adet değerli at işaretledi.`;
    }
    
    if (surpriseHorses.length >= 2) {
        return `KHELL bu koşuda sürpriz potansiyeli yüksek görüyor.`;
    }
    
    return "KHELL bu koşuda dengeli bir yarış bekliyor.";
}

/**
 * analyzeRace - Geliştirilmiş (MEVCUT YAPI KORUNUYOR)
 */
function analyzeRace(race) {
    if (!race.horses || race.horses.length === 0) {
        return {
            error: "Yarış verisi bulunamadı",
            raceName: race.raceName || "Bilinmeyen Koşu"
        };
    }
    
    const raceHorses = race.horses;
    const analyzedHorses = [];
    
    // Her atı zenginleştirilmiş analiz et
    for (const horse of raceHorses) {
        analyzedHorses.push({
            number: horse.number,
            name: horse.name,
            odds: horse.odds,
            // Mevcut alanlar
            overallScore: calculateOverallScore(horse, raceHorses),
            formScore: calculateFormScore(horse),
            surpriseScore: calculateSurpriseScore(horse, raceHorses),
            riskScore: calculateRiskScore(horse),
            isFavorite: horse.isFavorite,
            // YENİ ALANLAR
            momentumScore: calculateMomentumScore(horse),
            surfaceScore: calculateSurfaceScore(horse),
            distanceScore: calculateDistanceScore(horse),
            weightScore: calculateWeightScore(horse, raceHorses),
            jockeyScore: calculateJockeyScore(horse),
            valueScore: calculateValueScore(horse, raceHorses),
            confidenceScore: calculateConfidenceScore(horse, raceHorses),
            favoriteRiskScore: calculateFavoriteRiskScore(horse, raceHorses),
            agfValueScore: calculateAGFValueScore(horse, raceHorses),
            khellNote: generateKhellNote(horse, raceHorses)
        });
    }
    
    // Sıralamalar
    const sortedByScore = [...analyzedHorses].sort((a, b) => b.overallScore - a.overallScore);
    const sortedBySurprise = [...analyzedHorses].sort((a, b) => b.surpriseScore - a.surpriseScore);
    const sortedByValue = [...analyzedHorses].sort((a, b) => b.valueScore - a.valueScore);
    const sortedByOdds = [...raceHorses].sort((a, b) => (a.odds || 999) - (b.odds || 999));
    
    // Favori risk kontrolü
    const favorite = raceHorses.find(h => h.isFavorite === true) || sortedByOdds[0];
    let favoriteRisk = null;
    if (favorite) {
        const favoriteAnalysis = analyzedHorses.find(h => h.number === favorite.number);
        const favRiskScore = calculateFavoriteRiskScore(favorite, raceHorses);
        if (favRiskScore > 50) {
            favoriteRisk = {
                horseNumber: favorite.number,
                horseName: favorite.name,
                odds: favorite.odds,
                riskScore: favRiskScore,
                riskReason: "KHELL risk görüyor - favori beklentiyi karşılamayabilir",
                khellNote: favoriteAnalysis?.khellNote
            };
        }
    }
    
    // Gizli patlayıcı (en yüksek sürpriz + value kombinasyonu)
    let hiddenBomb = null;
    const bombCandidates = sortedBySurprise.filter(h => 
        h.surpriseScore > 70 && h.valueScore > 65 && h.riskScore < 60
    );
    if (bombCandidates.length > 0) {
        const bomb = bombCandidates[0];
        hiddenBomb = {
            horseNumber: bomb.number,
            horseName: raceHorses.find(h => h.number === bomb.number)?.name,
            odds: raceHorses.find(h => h.number === bomb.number)?.odds,
            surpriseScore: bomb.surpriseScore,
            valueScore: bomb.valueScore,
            comment: "KHELL günün gizli bombası olarak işaretledi - güçlü sürpriz+değer kombinasyonu"
        };
    } else if (sortedBySurprise[0] && sortedBySurprise[0].surpriseScore > 65) {
        const bomb = sortedBySurprise[0];
        hiddenBomb = {
            horseNumber: bomb.number,
            horseName: raceHorses.find(h => h.number === bomb.number)?.name,
            odds: raceHorses.find(h => h.number === bomb.number)?.odds,
            surpriseScore: bomb.surpriseScore,
            valueScore: bomb.valueScore,
            comment: "KHELL fırsat işaretledi - güçlü sürpriz potansiyeli"
        };
    }
    
    // Değerli ganyan (yüksek valueScore + makul odds)
    let valuePick = null;
    const valueCandidates = sortedByValue.filter(h => {
        const originalHorse = raceHorses.find(rh => rh.number === h.number);
        const odds = originalHorse?.odds || 0;
        return h.valueScore > 70 && odds >= 4 && odds <= 35;
    });
    if (valueCandidates.length > 0) {
        const pick = valueCandidates[0];
        valuePick = {
            horseNumber: pick.number,
            horseName: raceHorses.find(h => h.number === pick.number)?.name,
            odds: raceHorses.find(h => h.number === pick.number)?.odds,
            valueScore: pick.valueScore,
            comment: "KHELL değerli ganyan olarak işaretledi"
        };
    }
    
    // Kaos skoru
    const raceChaosScore = calculateRaceChaosScore(race);
    
    // Koşu notu
    const raceNote = generateRaceNote(race, raceChaosScore, favoriteRisk);
    
    // Güvenli kupon
    const safeCoupon = sortedByScore.slice(0, 2).map(h => ({
        horseNumber: h.number,
        horseName: raceHorses.find(rh => rh.number === h.number)?.name,
        odds: raceHorses.find(rh => rh.number === h.number)?.odds,
        overallScore: h.overallScore,
        confidenceScore: h.confidenceScore
    }));
    
    // Dengeli kupon (güvenli + sürpriz)
    const balancedCoupon = [
        sortedByScore[0],
        sortedBySurprise[0]
    ].filter(h => h && h.number !== sortedByScore[0]?.number).map(h => ({
        horseNumber: h.number,
        horseName: raceHorses.find(rh => rh.number === h.number)?.name,
        odds: raceHorses.find(rh => rh.number === h.number)?.odds
    }));
    if (balancedCoupon.length < 2 && sortedByScore[1]) {
        balancedCoupon.push({
            horseNumber: sortedByScore[1].number,
            horseName: raceHorses.find(rh => rh.number === sortedByScore[1].number)?.name,
            odds: raceHorses.find(rh => rh.number === sortedByScore[1].number)?.odds
        });
    }
    
    // Sürpriz kupon
    const surpriseCoupon = sortedBySurprise.slice(0, 2).map(h => ({
        horseNumber: h.number,
        horseName: raceHorses.find(rh => rh.number === h.number)?.name,
        odds: raceHorses.find(rh => rh.number === h.number)?.odds,
        surpriseScore: h.surpriseScore,
        valueScore: h.valueScore
    }));
    
    // İkili adayları (güvenli + sürpriz)
    const exactaCandidates = [];
    const safeTop = sortedByScore[0];
    const surpriseTop = sortedBySurprise[0];
    if (safeTop && surpriseTop && safeTop.number !== surpriseTop.number) {
        exactaCandidates.push({
            first: safeTop.number,
            second: surpriseTop.number,
            potential: Math.min(100, (safeTop.overallScore + surpriseTop.surpriseScore) / 2),
            type: "güvenli+sürpriz"
        });
    }
    if (sortedByValue[0] && sortedByScore[1] && sortedByValue[0].number !== sortedByScore[1].number) {
        exactaCandidates.push({
            first: sortedByScore[1]?.number,
            second: sortedByValue[0]?.number,
            potential: 75,
            type: "değer+form"
        });
    }
    
    // Tabela adayları (ilk 4 overall)
    const tabelaCandidates = sortedByScore.slice(0, 4).map(h => ({
        horseNumber: h.number,
        horseName: raceHorses.find(rh => rh.number === h.number)?.name,
        odds: raceHorses.find(rh => rh.number === h.number)?.odds,
        tabelaScore: h.confidenceScore || h.overallScore,
        confidenceScore: h.confidenceScore
    }));
    
    // Üçlü adayları (güçlü + form + sürpriz)
    const tripleCandidates = [];
    if (sortedByScore[0]) tripleCandidates.push({
        horseNumber: sortedByScore[0].number,
        horseName: raceHorses.find(rh => rh.number === sortedByScore[0].number)?.name,
        tripleScore: sortedByScore[0].confidenceScore || sortedByScore[0].overallScore,
        type: "güçlü"
    });
    if (sortedByScore[1] && sortedByScore[1].momentumScore > 60) tripleCandidates.push({
        horseNumber: sortedByScore[1].number,
        horseName: raceHorses.find(rh => rh.number === sortedByScore[1].number)?.name,
        tripleScore: sortedByScore[1].momentumScore,
        type: "form"
    });
    if (sortedBySurprise[0] && !tripleCandidates.find(c => c.horseNumber === sortedBySurprise[0].number)) {
        tripleCandidates.push({
            horseNumber: sortedBySurprise[0].number,
            horseName: raceHorses.find(rh => rh.number === sortedBySurprise[0].number)?.name,
            tripleScore: sortedBySurprise[0].surpriseScore,
            type: "sürpriz"
        });
    }
    
    // KHELL yorumu (mevcut formata uygun)
    let khellComment = raceNote;
    if (hiddenBomb && !khellComment.includes("gizli bomba")) {
        khellComment = `💣 ${hiddenBomb.comment} | ${raceNote}`;
    } else if (valuePick && !khellComment.includes("değerli")) {
        khellComment = `💰 ${valuePick.comment} | ${raceNote}`;
    }
    
    return {
        raceName: race.raceName,
        horses: analyzedHorses,
        // Mevcut alanlar
        hiddenBomb: hiddenBomb,
        valuePick: valuePick,
        favoriteRisk: favoriteRisk,
        safeCoupon: safeCoupon,
        balancedCoupon: balancedCoupon,
        surpriseCoupon: surpriseCoupon,
        exactaCandidates: exactaCandidates.slice(0, 3),
        tabelaCandidates: tabelaCandidates,
        tripleCandidates: tripleCandidates,
        khellComment: khellComment,
        // YENİ ALANLAR
        raceChaosScore: raceChaosScore,
        raceNote: raceNote,
        // Ek bilgiler
        topValueHorses: sortedByValue.slice(0, 2).map(h => ({
            number: h.number,
            name: h.name,
            valueScore: h.valueScore
        })),
        topSurpriseHorses: sortedBySurprise.slice(0, 2).map(h => ({
            number: h.number,
            name: h.name,
            surpriseScore: h.surpriseScore
        }))
    };
}

// ==================== GÜNLÜK ANALİZ (GELİŞTİRİLMİŞ) ====================

/**
 * analyzeAllRaces - Geliştirilmiş (MEVCUT YAPI KORUNUYOR)
 */
function analyzeAllRaces(races) {
    if (!races || races.length === 0) {
        return { error: "Yarış verisi bulunamadı", totalRaces: 0 };
    }
    
    const raceAnalyses = [];
    let bestHiddenBomb = null;
    let bestValuePick = null;
    let bestExacta = null;
    let bestTabela = null;
    let bestTriple = null;
    let riskiestFavorite = null;
    let chaosRace = null;
    let riskyFavorites = [];
    
    for (const race of races) {
        const analysis = analyzeRace(race);
        raceAnalyses.push(analysis);
        
        // En iyi gizli bomba
        if (analysis.hiddenBomb) {
            if (!bestHiddenBomb || analysis.hiddenBomb.surpriseScore > bestHiddenBomb.surpriseScore) {
                bestHiddenBomb = {
                    ...analysis.hiddenBomb,
                    raceName: analysis.raceName
                };
            }
        }
        
        // En iyi değerli ganyan
        if (analysis.valuePick) {
            if (!bestValuePick || analysis.valuePick.valueScore > (bestValuePick.valueScore || 0)) {
                bestValuePick = {
                    ...analysis.valuePick,
                    raceName: analysis.raceName
                };
            }
        }
        
        // En iyi ikili
        if (analysis.exactaCandidates && analysis.exactaCandidates.length > 0) {
            const bestInRace = analysis.exactaCandidates[0];
            if (!bestExacta || bestInRace.potential > (bestExacta.potential || 0)) {
                bestExacta = {
                    raceName: analysis.raceName,
                    first: bestInRace.first,
                    second: bestInRace.second,
                    potential: bestInRace.potential
                };
            }
        }
        
        // En iyi tabela
        if (analysis.tabelaCandidates && analysis.tabelaCandidates.length > 0) {
            const bestInRace = analysis.tabelaCandidates[0];
            if (!bestTabela || bestInRace.tabelaScore > (bestTabela.score || 0)) {
                bestTabela = {
                    raceName: analysis.raceName,
                    horseNumber: bestInRace.horseNumber,
                    horseName: bestInRace.horseName,
                    odds: bestInRace.odds,
                    score: bestInRace.tabelaScore
                };
            }
        }
        
        // En iyi üçlü
        if (analysis.tripleCandidates && analysis.tripleCandidates.length >= 2) {
            if (!bestTriple) {
                bestTriple = {
                    raceName: analysis.raceName,
                    horses: analysis.tripleCandidates.slice(0, 3).map(c => `${c.horseNumber} - ${c.horseName}`),
                    score: analysis.tripleCandidates.reduce((sum, c) => sum + (c.tripleScore || 70), 0) / 3
                };
            }
        }
        
        // En riskli favori
        if (analysis.favoriteRisk) {
            riskyFavorites.push({
                raceName: analysis.raceName,
                ...analysis.favoriteRisk
            });
            if (!riskiestFavorite || analysis.favoriteRisk.riskScore > riskiestFavorite.riskScore) {
                riskiestFavorite = {
                    raceName: analysis.raceName,
                    ...analysis.favoriteRisk
                };
            }
        }
        
        // Kaos koşusu
        if (analysis.raceChaosScore > 70) {
            if (!chaosRace || analysis.raceChaosScore > chaosRace.chaosScore) {
                chaosRace = {
                    raceName: analysis.raceName,
                    chaosScore: analysis.raceChaosScore,
                    note: analysis.raceNote
                };
            }
        }
    }
    
    // Günün özet yorumu
    let daySummary = "🔍 KHELL günlük analiz tamamlandı. ";
    if (bestHiddenBomb) daySummary += `💣 Günün gizli bombası: ${bestHiddenBomb.raceName} koşusunda ${bestHiddenBomb.horseName} (oran ${bestHiddenBomb.odds}). `;
    if (bestValuePick) daySummary += `💰 En değerli ganyan: ${bestValuePick.raceName} koşusunda ${bestValuePick.horseName}. `;
    if (riskiestFavorite) daySummary += `⚠️ En riskli favori: ${riskiestFavorite.raceName} koşusunda ${riskiestFavorite.horseName}. `;
    if (chaosRace) daySummary += `🌪️ Kaos koşusu uyarısı: ${chaosRace.raceName}. `;
    if (riskyFavorites.length > 0) daySummary += `${riskyFavorites.length} koşuda favori riski tespit edildi.`;
    
    return {
        totalRaces: races.length,
        raceAnalyses: raceAnalyses,
        // Mevcut alanlar
        bestHiddenBomb: bestHiddenBomb,
        bestValuePick: bestValuePick,
        bestExacta: bestExacta,
        bestTabela: bestTabela,
        bestTriple: bestTriple,
        riskyFavorites: riskyFavorites,
        // YENİ ALANLAR
        riskiestFavorite: riskiestFavorite,
        chaosRace: chaosRace,
        daySummary: daySummary,
        // İstatistikler
        statistics: {
            totalHorses: raceAnalyses.reduce((sum, r) => sum + (r.horses?.length || 0), 0),
            avgChaosScore: normalize(raceAnalyses.reduce((sum, r) => sum + (r.raceChaosScore || 0), 0) / Math.max(1, raceAnalyses.length)),
            totalBombs: raceAnalyses.filter(r => r.hiddenBomb).length,
            totalValuePicks: raceAnalyses.filter(r => r.valuePick).length,
            totalRiskyFavorites: riskyFavorites.length
        },
        khellDaySummary: daySummary
    };
}

// ==================== EXPORT (MEVCUT YAPI KORUNUYOR) ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Mevcut fonksiyonlar
        calculateFormScore,
        calculateSurfaceScore,
        calculateDistanceScore,
        calculateWeightScore,
        calculateJockeyScore,
        calculateOddsValueScore,
        calculateSurpriseScore,
        calculateRiskScore,
        analyzeRace,
        analyzeAllRaces,
        // YENİ export edilen fonksiyonlar
        calculateMomentumScore,
        calculateValueScore,
        calculateConfidenceScore,
        calculateFavoriteRiskScore,
        calculateAGFValueScore,
        calculateRaceChaosScore,
        generateKhellNote,
        generateRaceNote
    };
}

// ==================== BROWSER EXPORT (GÜNCELLENDİ) ====================

if (typeof window !== 'undefined') {
    // Defensive: analyzeRace tanımlı değilse fallback oluştur
    var _analyzeRace = typeof analyzeRace === 'function' ? analyzeRace : function(race) {
        console.warn('KHELL: analyzeRace fallback kullanılıyor');
        var horses = (race.horses || []).map(function(h) {
            return Object.assign({}, h, {
                formScore: 70, surpriseScore: 70, riskScore: 35, overallScore: 70
            });
        });
        var bomb = horses[0] || {};
        return {
            raceName: race.raceName,
            horses: horses,
            hiddenBomb: bomb.number ? { horseNumber: bomb.number, horseName: bomb.name, odds: bomb.odds, surpriseScore: 70, comment: "KHELL analiz edildi" } : null,
            valuePick: null, favoriteRisk: null,
            safeCoupon: horses.slice(0,2).map(function(h){ return { horseNumber: h.number, horseName: h.name, odds: h.odds }; }),
            balancedCoupon: horses.slice(0,3).map(function(h){ return { horseNumber: h.number, horseName: h.name, odds: h.odds }; }),
            surpriseCoupon: horses.slice(0,2).map(function(h){ return { horseNumber: h.number, horseName: h.name, odds: h.odds }; }),
            exactaCandidates: [{ first: horses[0]?.number, second: horses[1]?.number, potential: 80 }],
            tabelaCandidates: horses.slice(0,3).map(function(h){ return { horseNumber: h.number, horseName: h.name, tabelaScore: 70 }; }),
            tripleCandidates: horses.slice(0,3).map(function(h){ return { horseNumber: h.number, horseName: h.name, tripleScore: 70 }; }),
            raceChaosScore: 0, raceNote: "KHELL analiz tamamlandı."
        };
    };

    window.KhellEngine = {
        analyzeRace: _analyzeRace,
        analyzeAllRaces: analyzeAllRaces,
        version: "2.0"
    };

    // Eski sistemlerle uyum
    window.KHELL_ENGINE = window.KhellEngine;

    console.log("✅ KHELL Horse Engine v2.0 yüklendi");
}
