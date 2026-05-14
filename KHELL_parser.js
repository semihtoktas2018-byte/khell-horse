/**
 * KHELL Horse Parser — Veri Katmanı
 * Versiyon: 1.0
 *
 * Görev:
 *   Ham yarış verisini (API / JSON / scraper / demo) okur,
 *   standart KHELL formatına çevirir ve
 *   window.KHELL_RACES'e yazar.
 *
 * app.js, scoring.js, UI dosyalarına dokunmaz.
 * Sadece window.KHELL_RACES'i doldurur.
 *
 * Veri akışı:
 *   RAW_DATA → KhellParser.parse() → window.KHELL_RACES → app.js
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // YARDIMCI FONKSİYONLAR
  // ─────────────────────────────────────────────

  function safeStr(val, fallback) {
    if (val === null || val === undefined) return fallback || '';
    return String(val).trim() || fallback || '';
  }

  function safeNum(val, fallback) {
    if (val === null || val === undefined) return fallback || 0;
    var n = parseFloat(val);
    return isNaN(n) ? (fallback || 0) : n;
  }

  function safeArr(val) {
    return Array.isArray(val) ? val : [];
  }

  function safeBool(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
    if (typeof val === 'number') return val === 1;
    return false;
  }

  /** lastRuns: hem [1,2,3] hem "1,2,3" hem "1-2-3" formatını kabul et */
  function parseLastRuns(val) {
    if (Array.isArray(val)) {
      return val.map(function (v) { return safeNum(v, 5); }).slice(0, 10);
    }
    if (typeof val === 'string' && val.trim()) {
      return val.split(/[,\-\s]+/).map(function (v) { return safeNum(v, 5); }).slice(0, 10);
    }
    return [5, 5, 5]; // nötr fallback
  }

  /** Yüzey normalizasyonu — farklı kaynaklardan gelen string'leri standart hale getirir */
  function normalizeSurface(val) {
    var s = safeStr(val, 'çim').toLowerCase().trim();
    if (s.includes('kum') || s.includes('sand') || s.includes('dirt')) return 'kum';
    if (s.includes('sentetik') || s.includes('synth') || s.includes('tapeta')) return 'sentetik';
    return 'çim'; // default
  }

  /** Koşu tipi normalizasyonu */
  function normalizeType(val) {
    var s = safeStr(val, 'Handikap');
    var map = {
      'maiden': 'Maiden', 'group 1': 'Grup 1', 'group 2': 'Grup 2', 'group 3': 'Grup 3',
      'grup 1': 'Grup 1', 'grup 2': 'Grup 2', 'grup 3': 'Grup 3',
      'handicap': 'Handikap', 'handikap': 'Handikap',
      'listed': 'Listed', 'allowance': 'Serbest Ağırlık'
    };
    return map[s.toLowerCase()] || s;
  }

  // ─────────────────────────────────────────────
  // AT PARSER
  // ─────────────────────────────────────────────

  /**
   * Ham at objesini standart KHELL at formatına çevirir.
   * Hiçbir alan zorunlu değil — hepsi fallback'e düşer.
   */
  function parseHorse(raw, raceDistance) {
    if (!raw || typeof raw !== 'object') return null;

    var distance = raceDistance || safeNum(raw.distance, 1400);
    var surface  = normalizeSurface(raw.surface || raw.pist || raw.zemin);

    return {
      // Kimlik
      number : safeNum(raw.number || raw.no || raw.startNo || raw.horseNo, 0),
      name   : safeStr(raw.name   || raw.horseName || raw.atAdi || raw.horse, 'Bilinmeyen At'),

      // Jokey & Antrenör
      jockey         : safeStr(raw.jockey || raw.jokey || raw.jockeyName, 'Bilinmiyor'),
      jockeyWinRate  : safeNum(raw.jockeyWinRate  || raw.jockeyWin  || raw.jokeyKazanma, 10),
      trainerWinRate : safeNum(raw.trainerWinRate || raw.trainerWin || raw.antrenorKazanma, 10),

      // Fizik
      weight : safeNum(raw.weight || raw.kilo || raw.agirlik, 55),
      age    : safeNum(raw.age    || raw.yas,  4),

      // Pist & Mesafe
      surface              : surface,
      preferredSurface     : normalizeSurface(raw.preferredSurface || raw.tercihliPist || surface),
      distance             : distance,
      preferredDistanceMin : safeNum(raw.preferredDistanceMin || raw.minMesafe, distance - 200),
      preferredDistanceMax : safeNum(raw.preferredDistanceMax || raw.maxMesafe, distance + 200),

      // Form
      lastRuns : parseLastRuns(raw.lastRuns || raw.sonKosular || raw.form || raw.runs),

      // Bahis
      odds : safeNum(raw.odds || raw.oran || raw.ganyonOran, 10),
      agf  : safeNum(raw.agf  || raw.AGF,  5),

      // Favori flag
      isFavorite : safeBool(raw.isFavorite || raw.favori || (raw.odds && raw.odds < 3))
    };
  }

  // ─────────────────────────────────────────────
  // KOŞU PARSER
  // ─────────────────────────────────────────────

  var DEFAULT_TIMES = ['13:00', '13:45', '14:30', '15:15', '16:00', '16:45', '17:30'];

  /**
   * Ham koşu objesini standart KHELL koşu formatına çevirir.
   */
  function parseRace(raw, idx) {
    if (!raw || typeof raw !== 'object') return null;

    var distance = safeNum(raw.distance || raw.mesafe, 1400);
    var surface  = normalizeSurface(raw.surface || raw.pist);

    var horses = safeArr(raw.horses || raw.atlar || raw.participants)
      .map(function (h) { return parseHorse(h, distance); })
      .filter(Boolean);

    if (horses.length === 0) return null; // atsız koşuyu atla

    return {
      raceName : safeStr(
        raw.raceName || raw.name || raw.kosuAdi,
        (idx + 1) + '. Koşu'
      ),
      time     : safeStr(raw.time || raw.hour || raw.saat, DEFAULT_TIMES[idx] || '--:--'),
      track    : safeStr(raw.track || raw.hippodrome || raw.hipodrom || raw.venue, 'İstanbul Veliefendi'),
      surface  : surface,
      distance : distance,
      type     : normalizeType(raw.type || raw.category || raw.tur || raw.kosuTipi),
      horses   : horses
    };
  }

  // ─────────────────────────────────────────────
  // ANA PARSER
  // ─────────────────────────────────────────────

  var KhellParser = {

    version: '1.0',

    /**
     * parse(rawData)
     *
     * rawData formatları:
     *   - Array<race>          → doğrudan koşu dizisi
     *   - { races: [...] }     → races alanı içinde
     *   - { data: [...] }      → data alanı içinde
     *   - { results: [...] }   → results alanı içinde
     *   - JSON string          → otomatik parse edilir
     *
     * Sonuç: window.KHELL_RACES'e yazar, parsed array'i döner.
     */
    parse: function (rawData) {
      try {
        var data = rawData;

        // JSON string ise parse et
        if (typeof data === 'string') {
          try { data = JSON.parse(data); }
          catch (e) {
            console.warn('KHELL Parser: JSON parse hatası', e);
            return this._setFallback('JSON parse hatası');
          }
        }

        // Farklı wrapper formatları
        var raceList = null;
        if (Array.isArray(data)) {
          raceList = data;
        } else if (data && typeof data === 'object') {
          raceList = safeArr(
            data.races || data.data || data.results ||
            data.kosular || data.yarıslar || data.raceList
          );
        }

        if (!raceList || raceList.length === 0) {
          console.warn('KHELL Parser: Koşu verisi bulunamadı');
          return this._setFallback('Koşu verisi yok');
        }

        var parsed = raceList
          .map(function (r, i) { return parseRace(r, i); })
          .filter(Boolean);

        if (parsed.length === 0) {
          return this._setFallback('Parse edilen koşu yok');
        }

        window.KHELL_RACES = parsed;
        console.log('✅ KHELL Parser: ' + parsed.length + ' koşu parse edildi');
        return parsed;

      } catch (err) {
        console.error('KHELL Parser kritik hata:', err);
        return this._setFallback('Kritik hata: ' + err.message);
      }
    },

    /**
     * loadJSON(url, callback)
     * Fetch API ile dış JSON kaynağından veri çeker.
     * Gerçek API entegrasyonu için kullanılır.
     */
    loadJSON: function (url, callback) {
      if (typeof fetch === 'undefined') {
        console.warn('KHELL Parser: fetch desteklenmiyor');
        this._setFallback('fetch yok');
        if (typeof callback === 'function') callback(null);
        return;
      }

      var self = this;
      fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          var parsed = self.parse(data);
          if (typeof callback === 'function') callback(parsed);
        })
        .catch(function (err) {
          console.error('KHELL Parser fetch hatası:', err);
          self._setFallback('Fetch hatası');
          if (typeof callback === 'function') callback(null);
        });
    },

    /**
     * autoLoad()
     * GitHub Pages yapısı için: /data/latest.json'ı çeker.
     * Başarısız olursa window.KHELL_RACES'e dokunmaz — app.js fallback'i devreye girer.
     * 
     * Kullanım (KHELL_dataDemo.js yerine ya da önünde):
     *   KhellParser.autoLoad();
     *   KhellParser.autoLoad(function(ok) { console.log(ok ? 'canlı' : 'demo'); });
     */
    autoLoad: function (callback) {
      var self = this;
      // Otomatik base path: script tag'inin src'sinden klasör yolunu al
      // Hem local (/data/) hem GitHub Pages (/khell-horse/data/) için çalışır
      var base = (function() {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
          if (scripts[i].src && scripts[i].src.indexOf('KHELL_parser') !== -1) {
            return scripts[i].src.replace(/KHELL_parser\.js.*$/, '');
          }
        }
        return './'; // fallback
      })();
      var url = base + 'data/latest.json';
      this.loadJSON(url, function (parsed) {
        if (typeof callback === 'function') callback(!!parsed);
      });
    },

    /**
     * archiveLoad(dateStr)
     * Geçmiş tarihe ait arşiv dosyasını yükler.
     * dateStr örnek: '2026-05-07'
     *
     *   KhellParser.archiveLoad('2026-05-07');
     */
    archiveLoad: function (dateStr, callback) {
      if (!dateStr) { console.warn('KHELL Parser: archiveLoad — tarih belirtilmedi'); return; }
      var base = (function() {
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
          if (scripts[i].src && scripts[i].src.indexOf('KHELL_parser') !== -1) {
            return scripts[i].src.replace(/KHELL_parser\.js.*$/, '');
          }
        }
        return './';
      })();
      var url = base + 'data/' + dateStr + '.json';
      this.loadJSON(url, callback);
    },


    loadDemo: function () {
      var demoData = this._generateDemoData();
      return this.parse(demoData);
    },

    /**
     * _setFallback()
     * window.KHELL_RACES'i temizlemez — mevcut değer varsa korur.
     */
    _setFallback: function (reason) {
      console.warn('KHELL Parser fallback aktif:', reason);
      // window.KHELL_RACES zaten varsa dokunma — app.js kendi fallback'ini kullanır
      return window.KHELL_RACES || null;
    },

    /**
     * _generateDemoData()
     * Canlı veri simülasyonu.
     * Gerçek API geldiğinde bu metod kullanılmaz.
     */
    _generateDemoData: function () {
      var tracks   = ['İstanbul Veliefendi', 'Ankara 75. Yıl', 'İzmir Şirinyer', 'Bursa Osmangazi'];
      var surfaces = ['çim', 'kum', 'sentetik'];
      var types    = ['Maiden', 'Handikap', 'Grup 3', 'Serbest Ağırlık', 'Listed'];
      var jockeys  = ['A. Demir', 'M. Yıldız', 'S. Kaya', 'H. Kurt', 'B. Can', 'E. Ak', 'T. Öz', 'O. Yalçın'];

      function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
      function pick(arr)     { return arr[rnd(0, arr.length - 1)]; }
      function lastRuns(n)   { var r = []; for (var i = 0; i < n; i++) r.push(rnd(1, 8)); return r; }

      var horseNames = [
        'RAHAT OLL', 'ALTIN KANAT', 'MAVİ DALGA', 'SAFKAN RÜZGAR', 'OCEAN KING',
        'GÜMÜŞ OK', 'DAĞIN KARTALI', 'BLAZE FIRE', 'ŞİMŞEK ALİ', 'SONSUZ YILDIZ',
        'KARA FIRTINA', 'ALTIN AYAK', 'HÜZÜN ATLISI', 'DEMİR YUMRUK', 'BORA HANI',
        'ÇINAR KRAL', 'YILMAZ BEY', 'SİYAH İNCİ', 'KIZIL ŞIMŞEK', 'SULTAN RÜZGAR'
      ];
      var usedNames = [];

      function uniqueName() {
        var available = horseNames.filter(function (n) { return usedNames.indexOf(n) === -1; });
        if (available.length === 0) return 'AT-' + rnd(100, 999);
        var name = pick(available);
        usedNames.push(name);
        return name;
      }

      var races = [];
      var raceCount = rnd(4, 6);
      var times = ['13:00', '13:45', '14:30', '15:15', '16:00', '16:45'];

      for (var i = 0; i < raceCount; i++) {
        var surface  = pick(surfaces);
        var distance = pick([1000, 1200, 1400, 1600, 1800, 2000, 2200]);
        var horseCount = rnd(6, 12);
        var horses = [];
        var oddsPool = [];

        // Gerçekçi oran dağılımı
        for (var j = 0; j < horseCount; j++) {
          oddsPool.push(parseFloat((rnd(15, 500) / 10).toFixed(2)));
        }
        oddsPool.sort(function (a, b) { return a - b; });

        var favoriteIdx = 0; // en düşük oran favori
        for (var k = 0; k < horseCount; k++) {
          horses.push({
            number             : k + 1,
            name               : uniqueName(),
            jockey             : pick(jockeys),
            jockeyWinRate      : rnd(8, 28),
            trainerWinRate     : rnd(6, 22),
            weight             : rnd(50, 62),
            age                : rnd(3, 7),
            surface            : surface,
            preferredSurface   : Math.random() > 0.3 ? surface : pick(surfaces),
            distance           : distance,
            preferredDistanceMin: distance - rnd(0, 200),
            preferredDistanceMax: distance + rnd(0, 200),
            lastRuns           : lastRuns(rnd(3, 6)),
            odds               : oddsPool[k],
            agf                : parseFloat((rnd(10, 500) / 100).toFixed(2)),
            isFavorite         : k === favoriteIdx
          });
        }

        races.push({
          raceName : (i + 1) + '. Koşu',
          time     : times[i] || '--:--',
          track    : pick(tracks),
          surface  : surface,
          distance : distance,
          type     : pick(types),
          horses   : horses
        });
      }

      return races;
    }

  };

  // ─────────────────────────────────────────────
  // BROWSER EXPORT
  // ─────────────────────────────────────────────

  if (typeof window !== 'undefined') {
    window.KhellParser = KhellParser;
    console.log('✅ KHELL Parser v1.0 yüklendi');
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KhellParser;
  }

})();
