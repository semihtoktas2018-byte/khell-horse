/**
 * KHELL Horse Engine
 * At Yarışı Analiz Motoru
 * Risk ve Fırsat Analizi Sistemi
 * Versiyon: 1.0
 */

// ==================== TEMEL SKOR FONKSİYONLARI ====================

/**
 * 1. Form Skoru Hesaplama (0-100)
 * Son 5 yarışa göre - yükselen form ödüllendirilir
 */
function calculateFormScore(horse) {
    if (!horse.lastRuns || horse.lastRuns.length === 0) return 50;
    
    let totalScore = 0;
    const runs = horse.lastRuns.slice(0, 5);
    
    // Derece puanlaması (1. lik en yüksek)
    for (let i = 0; i < runs.length; i++) {
        const position = runs[i];
        if (position === 1) totalScore += 20;
        else if (position === 2) totalScore += 15;
        else if (position === 3) totalScore += 12;
        else if (position === 4) totalScore += 8;
        else if (position === 5) totalScore += 5;
        else totalScore += 2;
    }
    
    // Yükselen form bonusu (son yarışlar daha iyi gidiyorsa)
    let improvingBonus = 0;
    if (runs.length >= 3) {
        let improvements = 0;
        for (let i = 1; i < Math.min(4, runs.length); i++) {
            if (runs[i] < runs[i-1]) improvements++;
        }
        improvingBonus = improvements * 8;
    }
    
    // İlk 3'e girme bonusu
    const top3Count = runs.filter(p => p <= 3).length;
    const top3Bonus = top3Count * 5;
    
    let finalScore = totalScore + improvingBonus + top3Bonus;
    
    // Normalizasyon 0-100 arası
    finalScore = Math.min(100, Math.max(0, finalScore));
    
    return Math.round(finalScore);
}

/**
 * 2. Pist Uyum Skoru (0-100)
 */
function calculateSurfaceScore(horse) {
    if (!horse.surface || !horse.preferredSurface) return 50;
    
    if (horse.surface === horse.preferredSurface) return 100;
    
    // Kısmi uyum durumları
    const surfaceMatch = {
        'çim': { 'sentetik': 40, 'kum': 30 },
        'kum': { 'sentetik': 50, 'çim': 30 },
        'sentetik': { 'kum': 50, 'çim': 40 }
    };
    
    if (surfaceMatch[horse.surface] && surfaceMatch[horse.surface][horse.preferredSurface]) {
        return surfaceMatch[horse.surface][horse.preferredSurface];
    }
    
    return 30;
}

/**
 * 3. Mesafe Uyum Skoru (0-100)
 */
function calculateDistanceScore(horse) {
    if (!horse.distance || !horse.preferredDistanceMin || !horse.preferredDistanceMax) return 60;
    
    const distance = horse.distance;
    const minDist = horse.preferredDistanceMin;
    const maxDist = horse.preferredDistanceMax;
    
    // Tam uyum
    if (distance >= minDist && distance <= maxDist) return 100;
    
    // 100 metre tolerans
    if (distance >= minDist - 100 && distance <= maxDist + 100) return 70;
    
    // 200 metre tolerans
    if (distance >= minDist - 200 && distance <= maxDist + 200) return 40;
    
    // Uyumsuz
    return 20;
}

/**
 * 4. Kilo Avantaj Skoru (0-100)
 * Koşudaki diğer atlara göre kilo karşılaştırması
 */
function calculateWeightScore(horse, raceHorses) {
    if (!raceHorses || raceHorses.length === 0) return 50;
    
    const horseWeight = horse.weight || 55;
    const otherWeights = raceHorses.filter(h => h.number !== horse.number).map(h => h.weight || 55);
    
    if (otherWeights.length === 0) return 50;
    
    const avgWeight = otherWeights.reduce((a, b) => a + b, 0) / otherWeights.length;
    const weightDiff = avgWeight - horseWeight;
    
    // Hafif at avantajlı
    let score = 50 + (weightDiff * 5);
    
    return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * 5. Jokey Skoru (0-100)
 */
function calculateJockeyScore(horse) {
    const winRate = horse.jockeyWinRate || 0;
    const trainerRate = horse.trainerWinRate || 0;
    
    // Jokey %60, Antrenör %40 ağırlık
    let score = (winRate * 0.6) + (trainerRate * 0.4);
    
    return Math.min(100, Math.round(score));
}

/**
 * 6. Oran Değer Skoru (0-100)
 * Düşük oranlı favoriyi ödüllendirmez, ideal sürpriz aralığı 8-25
 */
function calculateOddsValueScore(horse) {
    const odds = horse.odds || 0;
    
    if (odds <= 0) return 50;
    
    // Çok düşük oran (aşırı favori - değersiz)
    if (odds < 2) return 10;
    if (odds < 3) return 20;
    if (odds < 5) return 35;
    if (odds < 8) return 50;
    
    // Sürpriz altın bölge
    if (odds >= 8 && odds < 15) return 95;
    if (odds >= 15 && odds <= 25) return 85;
    
    // Yüksek oran (riskli ama potansiyelli)
    if (odds > 25 && odds <= 40) return 60;
    if (odds > 40 && odds <= 60) return 40;
    
    // Çok yüksek oran (lotarya)
    if (odds > 60) return 20;
    
    return 50;
}

/**
 * 7. Sürpriz Skoru (KHELL Fırsat İşaretlemesi için)
 */
function calculateSurpriseScore(horse, raceHorses) {
    let score = 0;
    
    // Yüksek oran (30% ağırlık)
    const oddsValue = calculateOddsValueScore(horse);
    score += oddsValue * 0.30;
    
    // Düşük AGF (20% ağırlık) - Düşük AGF sürpriz potansiyeli
    const agf = horse.agf || 0;
    let agfScore = 50;
    if (agf > 0 && agf < 3) agfScore = 80;
    else if (agf >= 3 && agf < 6) agfScore = 60;
    else if (agf >= 6) agfScore = 40;
    score += agfScore * 0.20;
    
    // Yükselen form (20% ağırlık)
    const formScore = calculateFormScore(horse);
    const formBonus = formScore > 70 ? formScore : formScore * 0.5;
    score += formBonus * 0.20;
    
    // Pist ve mesafe uyumu (20% ağırlık)
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    const trackFit = (surfaceScore + distanceScore) / 2;
    score += trackFit * 0.15;
    
    // Kilo avantajı (10% ağırlık)
    const weightScore = calculateWeightScore(horse, raceHorses);
    score += weightScore * 0.10;
    
    // Favori olmama bonusu (5% bonus)
    if (!horse.isFavorite) score += 5;
    
    return Math.min(100, Math.round(score));
}

/**
 * 8. Risk Skoru (KHELL Risk Görüyor için)
 */
function calculateRiskScore(horse) {
    let riskScore = 0;
    
    // Yüksek oran riski
    const odds = horse.odds || 0;
    if (odds > 30) riskScore += 30;
    else if (odds > 15) riskScore += 15;
    else if (odds < 3) riskScore += 20; // Aşırı favori de riskli
    
    // Kötü form
    const formScore = calculateFormScore(horse);
    if (formScore < 40) riskScore += 25;
    else if (formScore < 60) riskScore += 10;
    
    // Pist uyumsuzluğu
    const surfaceScore = calculateSurfaceScore(horse);
    if (surfaceScore < 40) riskScore += 20;
    
    // Mesafe uyumsuzluğu
    const distanceScore = calculateDistanceScore(horse);
    if (distanceScore < 40) riskScore += 15;
    
    // Ağır kilo
    const weight = horse.weight || 55;
    if (weight > 60) riskScore += 10;
    
    return Math.min(100, riskScore);
}

// ==================== YARDIMCI FONKSİYONLAR ====================

/**
 * Atın genel performans skoru
 */
function calculateOverallScore(horse, raceHorses) {
    const formScore = calculateFormScore(horse);
    const surfaceScore = calculateSurfaceScore(horse);
    const distanceScore = calculateDistanceScore(horse);
    const weightScore = calculateWeightScore(horse, raceHorses);
    const jockeyScore = calculateJockeyScore(horse);
    
    // Ağırlıklı ortalama
    let overall = (formScore * 0.30) +
                  (surfaceScore * 0.20) +
                  (distanceScore * 0.20) +
                  (weightScore * 0.15) +
                  (jockeyScore * 0.15);
    
    return Math.round(overall);
}

/**
 * İkili (1-2) potansiyeli hesaplama
 */
function calculateExactaPotential(horse1, horse2, raceHorses) {
    const score1 = calculateOverallScore(horse1, raceHorses);
    const score2 = calculateOverallScore(horse2, raceHorses);
    const avgScore = (score1 + score2) / 2;
    
    // Farklı stil faktörü
    let styleBonus = 0;
    if (!horse1.isFavorite && !horse2.isFavorite) styleBonus = 15;
    else if (horse1.isFavorite || horse2.isFavorite) styleBonus = 5;
    
    return Math.min(100, avgScore + styleBonus);
}

/**
 * Tabela (1-2-3) potansiyeli
 */
function calculateTabelaPotential(horse, raceHorses) {
    const overallScore = calculateOverallScore(horse, raceHorses);
    const surpriseScore = calculateSurpriseScore(horse, raceHorses);
    
    // Tabela için istikrar önemli
    return Math.round((overallScore * 0.7) + (surpriseScore * 0.3));
}

/**
 * Üçlü Ganyan potansiyeli
 */
function calculateTriplePotential(horse, raceHorses) {
    const formScore = calculateFormScore(horse);
    const trackFit = (calculateSurfaceScore(horse) + calculateDistanceScore(horse)) / 2;
    
    // Üçlü için form ve uyum kritik
    return Math.min(100, Math.round((formScore * 0.6) + (trackFit * 0.4)));
}

// ==================== KOŞU ANALİZİ ====================

/**
 * 9. Tek Koşu Analizi
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
    
    // Her atı analiz et
    for (const horse of raceHorses) {
        analyzedHorses.push({
            number: horse.number,
            name: horse.name,
            odds: horse.odds,
            overallScore: calculateOverallScore(horse, raceHorses),
            formScore: calculateFormScore(horse),
            surpriseScore: calculateSurpriseScore(horse, raceHorses),
            riskScore: calculateRiskScore(horse),
            isFavorite: horse.isFavorite
        });
    }
    
    // Skorlara göre sırala
    const sortedByScore = [...analyzedHorses].sort((a, b) => b.overallScore - a.overallScore);
    const sortedBySurprise = [...analyzedHorses].sort((a, b) => b.surpriseScore - a.surpriseScore);
    const sortedByOdds = [...raceHorses].sort((a, b) => (a.odds || 999) - (b.odds || 999));
    
    // Favori risk kontrolü
    const favorite = raceHorses.find(h => h.isFavorite === true) || sortedByOdds[0];
    let favoriteRisk = null;
    if (favorite) {
        const favoriteAnalysis = analyzedHorses.find(h => h.number === favorite.number);
        if (favoriteAnalysis && favoriteAnalysis.riskScore > 60) {
            favoriteRisk = {
                horseNumber: favorite.number,
                horseName: favorite.name,
                odds: favorite.odds,
                riskReason: "KHELL risk görüyor - favori beklentiyi karşılamayabilir"
            };
        }
    }
    
    // Gizli patlayıcı (en yüksek sürpriz skoru)
    const hiddenBomb = sortedBySurprise[0] && sortedBySurprise[0].surpriseScore > 65 ? {
        horseNumber: sortedBySurprise[0].number,
        horseName: raceHorses.find(h => h.number === sortedBySurprise[0].number)?.name,
        odds: raceHorses.find(h => h.number === sortedBySurprise[0].number)?.odds,
        surpriseScore: sortedBySurprise[0].surpriseScore,
        comment: "KHELL fırsat işaretledi - güçlü sürpriz potansiyeli"
    } : null;
    
    // Değerli ganyan (yüksek overall + yüksek oran)
    let valuePick = null;
    for (let i = 0; i < sortedByScore.length; i++) {
        const horse = sortedByScore[i];
        const originalHorse = raceHorses.find(h => h.number === horse.number);
        if (originalHorse && (originalHorse.odds || 0) >= 4 && horse.overallScore > 65) {
            valuePick = {
                horseNumber: horse.number,
                horseName: originalHorse.name,
                odds: originalHorse.odds,
                overallScore: horse.overallScore,
                comment: "KHELL değerli ganyan olarak işaretledi"
            };
            break;
        }
    }
    
    // Güvenli kupon (yüksek overall + favori)
    const safeCoupon = sortedByScore.slice(0, 2).map(h => ({
        horseNumber: h.number,
        horseName: raceHorses.find(rh => rh.number === h.number)?.name,
        odds: raceHorses.find(rh => rh.number === h.number)?.odds,
        overallScore: h.overallScore
    }));
    
    // Dengeli kupon (karma: favori + sürpriz)
    const balancedCoupon = [
        sortedByScore[0],
        sortedBySurprise[0]
    ].filter(h => h).map(h => ({
        horseNumber: h.number,
        horseName: raceHorses.find(rh => rh.number === h.number)?.name,
        odds: raceHorses.find(rh => rh.number === h.number)?.odds
    }));
    
    // Sürpriz kupon
    const surpriseCoupon = sortedBySurprise.slice(0, 2).map(h => ({
        horseNumber: h.number,
        horseName: raceHorses.find(rh => rh.number === h.number)?.name,
        odds: raceHorses.find(rh => rh.number === h.number)?.odds,
        surpriseScore: h.surpriseScore
    }));
    
    // İkili adayları
    const exactaCandidates = [];
    for (let i = 0; i < Math.min(3, sortedByScore.length); i++) {
        for (let j = i + 1; j < Math.min(4, sortedByScore.length); j++) {
            const potential = calculateExactaPotential(
                raceHorses.find(h => h.number === sortedByScore[i].number),
                raceHorses.find(h => h.number === sortedByScore[j].number),
                raceHorses
            );
            if (potential > 70) {
                exactaCandidates.push({
                    first: sortedByScore[i].number,
                    second: sortedByScore[j].number,
                    potential: potential
                });
            }
        }
    }
    
    // Tabela adayları
    const tabelaCandidates = sortedByScore.slice(0, 4).map(h => ({
        horseNumber: h.number,
        horseName: raceHorses.find(rh => rh.number === h.number)?.name,
        tabelaScore: calculateTabelaPotential(
            raceHorses.find(rh => rh.number === h.number),
            raceHorses
        )
    }));
    
    // Üçlü ganyan adayları
    const tripleCandidates = sortedByScore.slice(0, 3).map(h => ({
        horseNumber: h.number,
        horseName: raceHorses.find(rh => rh.number === h.number)?.name,
        tripleScore: calculateTriplePotential(
            raceHorses.find(rh => rh.number === h.number),
            raceHorses
        )
    }));
    
    // KHELL yorumu
    let khellComment = "";
    if (hiddenBomb && valuePick) {
        khellComment = `KHELL bu koşuda hem sürpriz (${hiddenBomb.horseName}) hem de değerli (${valuePick.horseName}) fırsat görüyor.`;
    } else if (hiddenBomb) {
        khellComment = `KHELL ${hiddenBomb.horseName} atında güçlü sürpriz potansiyeli işaretledi.`;
    } else if (valuePick) {
        khellComment = `KHELL ${valuePick.horseName} atını değerli ganyan olarak işaretledi.`;
    } else if (favoriteRisk) {
        khellComment = `KHELL ${favoriteRisk.horseName} için risk uyarısı veriyor. Alternatiflere yönelin.`;
    } else {
        khellComment = `KHELL bu koşuda dengeli dağılım görüyor. Önerilen: ${safeCoupon[0].horseName} - ${safeCoupon[1]?.horseName}`;
    }
    
    return {
        raceName: race.raceName,
        horses: analyzedHorses,
        hiddenBomb: hiddenBomb,
        valuePick: valuePick,
        favoriteRisk: favoriteRisk,
        safeCoupon: safeCoupon,
        balancedCoupon: balancedCoupon,
        surpriseCoupon: surpriseCoupon,
        exactaCandidates: exactaCandidates.slice(0, 2),
        tabelaCandidates: tabelaCandidates,
        tripleCandidates: tripleCandidates,
        khellComment: khellComment
    };
}

// ==================== GÜNLÜK ANALİZ ====================

/**
 * 10. Tüm Gün Analizi
 */
function analyzeAllRaces(races) {
    if (!races || races.length === 0) {
        return { error: "Yarış verisi bulunamadı" };
    }
    
    const raceAnalyses = [];
    let bestHiddenBomb = null;
    let bestValuePick = null;
    let bestExacta = null;
    let bestTabela = null;
    let bestTriple = null;
    let riskyFavorites = [];
    
    for (const race of races) {
        const analysis = analyzeRace(race);
        raceAnalyses.push(analysis);
        
        // En iyi gizli patlayıcı
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
            if (!bestValuePick || analysis.valuePick.overallScore > bestValuePick.overallScore) {
                bestValuePick = {
                    ...analysis.valuePick,
                    raceName: analysis.raceName
                };
            }
        }
        
        // En iyi ikili
        if (analysis.exactaCandidates && analysis.exactaCandidates.length > 0) {
            const bestInRace = analysis.exactaCandidates[0];
            if (!bestExacta || bestInRace.potential > bestExacta.potential) {
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
            if (!bestTabela || bestInRace.tabelaScore > bestTabela.score) {
                bestTabela = {
                    raceName: analysis.raceName,
                    horseNumber: bestInRace.horseNumber,
                    horseName: bestInRace.horseName,
                    score: bestInRace.tabelaScore
                };
            }
        }
        
        // En iyi üçlü
        if (analysis.tripleCandidates && analysis.tripleCandidates.length > 0) {
            const bestInRace = analysis.tripleCandidates[0];
            if (!bestTriple || bestInRace.tripleScore > bestTriple.score) {
                bestTriple = {
                    raceName: analysis.raceName,
                    horses: analysis.tripleCandidates.map(c => `${c.horseNumber} - ${c.horseName}`),
                    score: bestInRace.tripleScore
                };
            }
        }
        
        // Riskli favoriler
        if (analysis.favoriteRisk) {
            riskyFavorites.push({
                raceName: analysis.raceName,
                ...analysis.favoriteRisk
            });
        }
    }
    
    // Günün özet yorumu
    let daySummary = "KHELL günlük analiz tamamlandı. ";
    if (bestHiddenBomb) daySummary += `Günün sürpriz adayı: ${bestHiddenBomb.raceName} koşusunda ${bestHiddenBomb.horseName}. `;
    if (bestValuePick) daySummary += `En değerli ganyan: ${bestValuePick.raceName} koşusunda ${bestValuePick.horseName}. `;
    if (riskyFavorites.length > 0) daySummary += `${riskyFavorites.length} koşuda favori riski tespit edildi.`;
    
    return {
        totalRaces: races.length,
        raceAnalyses: raceAnalyses,
        bestHiddenBomb: bestHiddenBomb,
        bestValuePick: bestValuePick,
        bestExacta: bestExacta,
        bestTabela: bestTabela,
        bestTriple: bestTriple,
        riskyFavorites: riskyFavorites,
        daySummary: daySummary
    };
}

// ==================== EXPORT ve DEMO ====================

// Browser ve Node.js uyumluluğu
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateFormScore,
        calculateSurfaceScore,
        calculateDistanceScore,
        calculateWeightScore,
        calculateJockeyScore,
        calculateOddsValueScore,
        calculateSurpriseScore,
        calculateRiskScore,
        analyzeRace,
        analyzeAllRaces
    };
}

// ==================== DEMO KULLANIM ====================
// Aşağıdaki kod sadece demo amaçlıdır, gerçek entegrasyonda kaldırılabilir

if (typeof window !== 'undefined') {
    window.KhellEngine = {
        analyzeRace,
        analyzeAllRaces
    };
    
    // Demo veri ile test
    const demoRace = {
        raceName: "İstanbul Koşusu - 1400m Çim",
        horses: [
            {
                number: 1,
                name: "KARA ŞİMŞEK",
                jockey: "M. Demir",
                weight: 58,
                age: 5,
                lastRuns: [2, 1, 3, 1, 2],
                surface: "çim",
                preferredSurface: "çim",
                distance: 1400,
                preferredDistanceMin: 1200,
                preferredDistanceMax: 1600,
                odds: 2.5,
                agf: 2.1,
                isFavorite: true,
                jockeyWinRate: 22,
                trainerWinRate: 18
            },
            {
                number: 7,
                name: "RAHAT OLL",
                jockey: "A. Demir",
                weight: 54,
                age: 4,
                lastRuns: [6, 4, 3, 2, 1],
                surface: "çim",
                preferredSurface: "çim",
                distance: 1400,
                preferredDistanceMin: 1200,
                preferredDistanceMax: 1600,
                odds: 14.80,
                agf: 4.5,
                isFavorite: false,
                jockeyWinRate: 18,
                trainerWinRate: 12
            },
            {
                number: 3,
                name: "ALBAY",
                jockey: "S. Yılmaz",
                weight: 56,
                age: 6,
                lastRuns: [5, 5, 6, 4, 7],
                surface: "çim",
                preferredSurface: "kum",
                distance: 1400,
                preferredDistanceMin: 1000,
                preferredDistanceMax: 1200,
                odds: 45.0,
                agf: 8.2,
                isFavorite: false,
                jockeyWinRate: 8,
                trainerWinRate: 6
            }
        ]
    };
    
    console.log("=== KHELL HORSE ENGINE DEMO ===");
    console.log(analyzeRace(demoRace));
}