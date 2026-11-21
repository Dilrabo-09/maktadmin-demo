/* Maktadmin — namunaviy (to'qima) ma'lumotlar.
   Bu yerdagi barcha ism, telefon va natijalar o'ylab topilgan — haqiqiy shaxslarga aloqasi yo'q. */
(function () {
  // Takrorlanuvchi tasodifiy sonlar (har safar bir xil demo chiqishi uchun)
  let seed = 20261117;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const between = (a, b) => Math.round(a + rnd() * (b - a));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  const school = {
    name: "Namunaviy 21-sonli umumta'lim maktabi",
    region: "Namuna tumani",
    year: "2026–2027 o'quv yili",
  };

  const users = [
    { id: "u1", name: "Dilnoza Karimova", role: "maslahatchi", title: "Direktorning maslahatchisi" },
    { id: "u2", name: "Bahodir Saidov", role: "direktor", title: "Maktab direktori" },
    { id: "u3", name: "Aziz Rahimov", role: "sinfrahbar", title: "7-A sinf rahbari", sinf: "7-A" },
    { id: "u4", name: "Nodira Yusupova", role: "psixolog", title: "Amaliyotchi psixolog" },
  ];

  const roles = {
    maslahatchi: { label: "Maslahatchi", pages: "*", scope: "all", psych: true },
    direktor: { label: "Direktor", pages: ["bugun", "oquvchilar", "xavf", "togaraklar", "jadval", "yutuqlar", "testlar", "kasb", "sorovnoma", "hisobot", "ishreja", "kengash", "hujjatlar"], scope: "all", psych: false },
    sinfrahbar: { label: "Sinf rahbari", pages: ["bugun", "oquvchilar", "xavf", "togaraklar", "jadval", "yutuqlar", "testlar", "ishreja"], scope: "sinf", psych: false },
    psixolog: { label: "Psixolog", pages: ["bugun", "oquvchilar", "xavf", "psixolog", "sorovnoma", "ishreja"], scope: "all", psych: true },
  };

  const clubs = [
    { id: "c1", name: "Yosh robototexnik", type: "Tarmoq to'garagi", leader: "Sherzod Ergashev", days: [2, 4], time: "15:00", room: "Informatika xonasi", cap: 16 },
    { id: "c2", name: "Shaxmat klubi", type: "Maktab klubi", leader: "Rustam Nazarov", days: [1, 3], time: "14:30", room: "Kutubxona", cap: 20 },
    { id: "c3", name: "English Speaking Club", type: "Maktab klubi", leader: "Gulnora Hasanova", days: [2, 5], time: "14:00", room: "204-xona", cap: 18 },
    { id: "c4", name: "Futbol", type: "Tarmoq to'garagi", leader: "Anvar Qodirov", days: [1, 3, 5], time: "16:00", room: "Sport maydoni", cap: 24 },
    { id: "c5", name: "Yosh jurnalist", type: "Maktab klubi", leader: "Sevara Mirzayeva", days: [4], time: "15:00", room: "112-xona", cap: 12 },
    { id: "c6", name: "Debat klubi", type: "Maktab klubi", leader: "Dilnoza Karimova", days: [3], time: "15:30", room: "Faollar zali", cap: 14 },
    { id: "c7", name: "Python dasturlash", type: "Kelajak.uzedu", leader: "Sherzod Ergashev", days: [1, 4], time: "16:00", room: "Informatika xonasi", cap: 15 },
    { id: "c8", name: "Tasviriy san'at", type: "Tarmoq to'garagi", leader: "Kamola Sobirova", days: [2], time: "14:00", room: "San'at xonasi", cap: 20 },
  ];

  const boys = ["Jasur", "Sardor", "Bekzod", "Azizbek", "Doniyor", "Shohruh", "Otabek", "Javohir", "Islom", "Abdulloh", "Behruz", "Sanjar", "Ulug'bek", "Firdavs", "Muhammadali"];
  const girls = ["Malika", "Dilnoza", "Madina", "Sevara", "Zarina", "Nilufar", "Shahzoda", "Gulnoza", "Mohinur", "Sabina", "Robiya", "Feruza", "Kamola", "Munisa", "Charos"];
  const surnames = ["Aliyev", "Karimov", "Rahimov", "Tursunov", "Yusupov", "Nazarov", "Ergashev", "Qodirov", "Saidov", "Hasanov", "Mirzayev", "Abdullayev", "Xolmatov", "Sobirov", "Umarov"];
  const interests = ["Dasturlash", "Matematika", "Ingliz tili", "Sport", "Rassomlik", "Musiqa", "Biologiya", "Jurnalistika", "Tarix", "Robototexnika", "Kimyo", "Notiqlik"];
  const plans = ["OTM", "OTM", "OTM", "Kollej / texnikum", "Ish / hunar", "Aniqlanmagan"];
  const classes = ["5-A", "5-B", "6-A", "6-B", "7-A", "7-B", "8-A", "8-B", "9-A", "9-B", "10-A", "11-A"];

  const students = [];
  let n = 0;
  classes.forEach((sinf) => {
    const grade = parseInt(sinf, 10);
    const count = sinf === "7-A" ? 9 : 6;
    for (let i = 0; i < count; i++) {
      n++;
      const girl = rnd() < 0.5;
      const sur = pick(surnames);
      const birthYear = 2026 - (grade + 6) - (rnd() < 0.3 ? 1 : 0);
      const birth = new Date(birthYear, between(0, 11), between(1, 28));
      const nClubs = rnd() < 0.27 ? 0 : (rnd() < 0.65 ? 1 : 2);
      const myClubs = [];
      while (myClubs.length < nClubs) { const c = pick(clubs).id; if (!myClubs.includes(c)) myClubs.push(c); }
      const base = between(55, 92);
      const drift = rnd() < 0.2 ? -between(15, 28) : between(-6, 10);
      const tests = Array.from({ length: 6 }, (_, k) => Math.max(20, Math.min(100, Math.round(base + (drift * k) / 5 + between(-4, 4)))));
      const s = {
        id: "s" + n,
        first: girl ? pick(girls) : pick(boys),
        last: girl ? sur + "a" : sur,
        gender: girl ? "Q" : "O",
        sinf,
        birth,
        phone: "+998 9" + between(0, 9) + " " + between(100, 999) + "-" + between(10, 99) + "-" + between(10, 99),
        interests: [pick(interests), pick(interests)].filter((v, i, a) => a.indexOf(v) === i),
        clubs: myClubs,
        attendance: rnd() < 0.18 ? between(68, 84) : between(88, 99),
        tests,
        achievements: [],
        psychFlag: rnd() < 0.08,
        plan: grade >= 9 ? pick(plans) : null,
        risksHandled: false,
      };
      students.push(s);
    }
  });

  // Ikki o'quvchining tug'ilgan kuni — bugun (demo uchun)
  [3, 27].forEach((i) => { const b = students[i].birth; students[i].birth = new Date(b.getFullYear(), today.getMonth(), today.getDate()); });

  // Yutuqlar
  const achievementPool = [
    ["Matematika olimpiadasi", "Tuman bosqichi", "1-o'rin"],
    ["Matematika olimpiadasi", "Viloyat bosqichi", "3-o'rin"],
    ["Ingliz tili olimpiadasi", "Tuman bosqichi", "2-o'rin"],
    ["\"Yosh dasturchi\" tanlovi", "Viloyat", "Faxriy yorliq"],
    ["Shaxmat musobaqasi", "Tuman", "1-o'rin"],
    ["Mini-futbol turniri", "Tuman", "2-o'rin"],
    ["Biologiya olimpiadasi", "Tuman bosqichi", "3-o'rin"],
    ["IELTS", "Sertifikat", "6.5"],
    ["Milliy sertifikat — matematika", "Sertifikat", "A+"],
    ["\"Eng yaxshi insho\" tanlovi", "Maktab", "1-o'rin"],
  ];
  for (let i = 0; i < 22; i++) {
    const s = pick(students);
    const a = pick(achievementPool);
    s.achievements.push({ title: a[0], level: a[1], result: a[2], date: addDays(-between(5, 70)) });
  }

  const tasks = [
    { id: "t1", title: "Choraklik hisobotni direktorga topshirish", due: addDays(-2), tag: "Hisobot", done: false },
    { id: "t2", title: "O'quvchilar Kengashi yig'ilishini o'tkazish", due: addDays(0), tag: "Kengash", done: false },
    { id: "t3", title: "9-sinflar uchun kasbga yo'naltirish so'rovnomasi", due: addDays(0), tag: "Kasb", done: false },
    { id: "t4", title: "Robototexnika to'garagi davomatini tekshirish", due: addDays(0), tag: "To'garak", done: true },
    { id: "t5", title: "IT-park ekskursiyasi uchun ro'yxat tuzish", due: addDays(2), tag: "Kasb", done: false },
    { id: "t6", title: "Ota-onalar yig'ilishi taqdimotini tayyorlash", due: addDays(5), tag: "Ota-onalar", done: false },
  ];

  const events = [
    { id: "e1", title: "O'quvchilar Kengashi yig'ilishi", date: addDays(0), time: "15:30", place: "Faollar zali" },
    { id: "e2", title: "IT-park ekskursiyasi (9-sinflar)", date: addDays(3), time: "10:00", place: "Tuman IT-park" },
    { id: "e3", title: "Ota-onalar umumiy yig'ilishi", date: addDays(6), time: "17:00", place: "Majlislar zali" },
  ];

  const psychNotes = [
    { sid: null, date: addDays(-3), type: "Individual suhbat", note: "Sinfdoshlari bilan munosabatda qiyinchilik. Keyingi uchrashuv 2 haftadan so'ng." },
    { sid: null, date: addDays(-9), type: "Ota-ona bilan uchrashuv", note: "Uy sharoiti muhokama qilindi, sinf rahbari bilan kelishilgan reja tuzildi." },
    { sid: null, date: addDays(-15), type: "Test (xavotir darajasi)", note: "O'rtacha daraja. Kuzatuv davom etadi." },
  ];
  const flagged = students.filter((s) => s.psychFlag);
  psychNotes.forEach((p, i) => { p.id = "p" + (i + 1); p.sid = (flagged[i] || students[i * 7]).id; });

  window.MA = { school, users, roles, clubs, students, tasks, events, psychNotes, today };
})();
