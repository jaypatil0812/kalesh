/* KALESH.EXE — MEME VAULT (built-in edition)
   Everything humorous lives here so the jokes can be refreshed without touching app logic.
   In live mode, rows from the Supabase `memes` and `news_flashes` tables are merged on top. */
window.KALESH_CONTENT = {
  fourthWall: {
    siren: [
      'Mummy ko pata hai tu kya kar raha hai?',
      'Exclusive: “Bas ek minute” ka 24va minute chal raha hai.',
      'Aapne khud siren dabaya. Ab shor ki complaint kis se karoge?',
      'Screen time ne statement dene se mana kar diya hai.',
      'Desh baad mein jaanega. Pehle batao, assignment submit kiya?',
      'Neighbourhood sources confirm: chai thandi ho chuki hai.',
      'Agle break ke baad bhi yahi chalega. Humne aur kuch banaya hi nahi.',
      'Mummy live on line one: Wi-Fi ka bill bharne wala kaun hai?',
      'Breaking: Incognito mode ne mummy se immunity maangi. Arzi kharij.',
      'Aap dekh rahe hain Kalesh Tak. Aapko kaam bhi tha, allegedly.'
    ],
    scroll: [
      'Mummy ko pata hai tu kya kar raha hai?',
      'Bhai, scroll karte karte thumb ka internship lag gaya.',
      'You said “last post” three posts ago. Sootron ke hawale se.',
      'Phone ko charge pe laga diya. Apne plans ka kya?'
    ],
    empty: [
      'Yahan koi kalesh nahi. Screenshots lene ki zaroorat nahi.',
      'The group chat has read this topic and chosen silence.',
      'Zero posts. Ek baar toh internet ne bola: rehne de.'
    ],
    ticket: [
      'Your mystery prize is one (1) minute of plausible productivity.',
      'Interval mein samosa khatam. But the group chat is still open.',
      'You found the director’s cut. It’s just you finishing the work you opened this tab to avoid.',
      'Audience feedback: aapko film se zyada comment section pasand aaya.'
    ]
  },
  // [emoji, title, caption, sound]
  memes: [
    ['🐈', 'BILLI IT DEPARTMENT', 'Server pe billi baithi hai. Management se baat mat karna.', 'pop'],
    ['🦆', 'BATAK HIGH COMMAND', 'Quack quack. Strategic nonsense has been deployed.', 'quack'],
    ['🎬', 'ABSOLUTE CINEMA', 'Interval se pehle hi blockbuster ho gaya.', 'boom'],
    ['🗿', '+999 AURA', 'Bina kuch kiye aura farm ho gaya. Respect.', 'boom'],
    ['💀', 'BRAIN.EXE NOT FOUND', 'Brain cells not found. Mission phir bhi successful.', 'error'],
    ['🍿', 'KHAO POPCORN', 'Comment section is a better movie than the movie.', 'pop'],
    ['🚨', 'BREAKING BAKCHODI', 'Desh jaanna chahta hai ki tumne ye kyun click kiya.', 'siren'],
    ['🔥', 'RASODE MEIN KAUN THA?', 'Investigation jaari hai. Cooker ne sab dekha.', 'serial'],
    ['😼', 'CAT SUPREMACY', 'There is no controversy. Cat wins unanimously.', 'pop'],
    ['📢', 'BAHUT BADI KHABAR', 'Nobody asked. Everyone has an opinion.', 'airhorn'],
    ['🧠', '1 BRAIN CELL LEFT', 'Warning: this is a shared resource. Use responsibly.', 'bruh'],
    ['💣', 'DHAMAKA HO GAYA', 'Good news: nothing productive was damaged.', 'dhamaka'],
    ['🎮', 'GTA 6 SE PEHLE', 'Ye meme GTA 6 se pehle aa gaya. History.', 'powerup'],
    ['🌍', '26 ME DUNIYA KHATAM', 'Toh kalesh abhi kar lo. Baad mein time nahi milega.', 'boom'],
    ['🥶', 'CHILL GUY DETECTED', 'Timeline jal rahi hai, ye bhai chai pee raha hai.', 'pop'],
    ['🤌', 'TRALALERO KALESHA', 'Italian brainrot ka Indian cousin. Nobody can stop him.', 'airhorn'],
    ['6️⃣', 'SIX SEVEN', 'Koi nahi jaanta iska matlab. Isliye funny hai.', 'bruh'],
    ['🫡', 'NPC OF THE WEEK', 'Same reply 47 baar. Programming flawless.', 'error'],
    ['🍳', 'BRO IS COOKED', 'Fully cooked. Masala bhi daal diya.', 'sad'],
    ['👁️', 'SOOTRON KE HAWALE SE', 'Sootron ne kaha. Sootron ko kisne kaha? Pata nahi.', 'siren'],
    ['🎤', 'PICTURE ABHI BAAKI HAI', 'Thread 1/47. Bhai ruk ja.', 'serial'],
    ['🪑', 'RASHTRIYA NALLA AWARD', 'Trophy plastic ki kursi hai. Phir bhi izzat hai.', 'tada'],
    ['🤡', 'DELULU IS THE SOLULU', 'Bataks ki official strategy. Kaam kar rahi hai.', 'quack'],
    ['📉', 'AURA MARKET CRASH', 'Kisi ne "source?" bola. -500 aura.', 'sad'],
    ['🧃', 'MUMMY ALERT', 'Mummy ko pata hai tu kya kar raha hai.', 'siren'],
    ['🛑', 'BHAI BAS KAR', 'Server ki bhi family hai.', 'bruh'],
    ['🎺', 'BAND BAAJA BAKCHODI', 'Shaadi nahi hai. Phir bhi band baj gaya.', 'airhorn'],
    ['👑', 'KALESH SAMRAT', 'Na padhai, na naukri. Sirf kalesh. Legend.', 'tada']
  ],

  // Sticker words that spawn on random clicks
  stickers: ['BRUH', '+1 AURA', 'WAH!', 'KYA BAAT', 'CINEMA', 'MOYE MOYE', 'DHAMAKA', 'NALLA', 'QUACK', 'ROFL', 'SHEESH', 'OOF', 'KHATARNAK', 'BAKCHODI', 'SKILL ISSUE', 'L + RATIO', 'COOKED', 'PEAK', 'SAHI HAI', 'AAAA'],
  stickerEmoji: ['🐈', '🦆', '💥', '🔥', '🗿', '💀', '🤡', '🍿', '🌶️', '🎬', '🫠', '😭', '🤌', '👀', '⚡', '🪩'],

  // Indian-news-channel style headlines for the ticker
  news: [
    'BILLI NE SERVER PE KABZA KIYA — SARKAR MAUN',
    'SOOTRON KE HAWALE SE: BATAKS NE QUACK KIYA, BALAKS NE REPLY MEIN 47 TWEET LIKHE',
    'DESH JAANNA CHAHTA HAI: GROUP CHAT MEIN SEEN KARKE REPLY KYUN NAHI KIYA?',
    'SABSE BADA KHULASA: 2026 MEIN DUNIYA KHATAM, GTA 6 PHIR BHI NAHI AAYA',
    'AAJ RAAT 9 BAJE MAHABAHAS — "PEAK" SHABD KISKA HAI?',
    'TEZ KHABAR: EK AADMI NE APNI GALTI MAANI; INTERNET SADME MEIN',
    'MAUSAM VIBHAG: TIMELINE PE 100% KALESH KI SAMBHAVNA',
    'ALERT: MUMMY NE SCREEN TIME DEKH LIYA — HALAAT GAMBHEER',
    'SHARE BAZAAR: AURA INDEX 999 POINT UPAR, BRAIN CELL INDEX ZERO PE BAND',
    'CRICKET: COMMENT SECTION NE MATCH SE ZYADA RUNS BANAYE',
    'EXCLUSIVE: KALESH KE PEECHE KA SACH — WIFI ZIMMEDAR?',
    'BREAKING: VERIFIED ACCOUNT KO EK BILLI NE ARGUMENT MEIN HARAYA',
    'BADI KHABAR: 19 SLIDE KI APOLOGY PPT RELEASE, PIE CHART BHI SHAMIL',
    'CHHAPA: NALLA MANTRALAYA MEIN NAYI BHARTIYAN — QUALIFICATION: SCROLLING'
  ],

  // The legendary debate panel on the news page
  panel: [
    { emoji: '🐈', name: 'BILLI JI', role: 'Server Expert', lines: ['MEOW. MERA POINT SUNIYE.', 'Main 9 lives se ye dekh rahi hoon.', 'Ye sab WiFi ki saazish hai!', 'MAIN SAB JAANTI HOON.'] },
    { emoji: '🦆', name: 'BATAK PRAVAKTA', role: 'Bataks Spokesduck', lines: ['QUACK! AAP DESH KO GUMRAAH KAR RAHE HAIN!', 'Skill issue hai, aur kuch nahi.', 'Hum delulu nahi, visionary hain!', 'QUACK QUACK QUACK.'] },
    { emoji: '🧒', name: 'BALAK PRAVAKTA', role: 'Balaks Spokesperson', lines: ['MUJHE BOLNE DIJIYE! MUJHE BOLNE DIJIYE!', 'Hum haarenge nahi. Shayad.', 'Ye bataks ki IT cell hai!', 'Josh 100, logic optional.'] },
    { emoji: '🗿', name: 'PROF. AURA', role: 'Aura Analyst', lines: ['Data kehta hai: -500 aura.', '...', 'Main kuch nahi kahunga. +200 aura.', 'Statistically, sab cooked hain.'] },
    { emoji: '👵', name: 'MUMMY', role: 'Screen-Time Expert', lines: ['PHONE RAKH DE!', 'Sharma ji ka beta toh IIT mein hai.', 'Khana thanda ho raha hai!', 'Ye kalesh-walesh band karo.'] },
    { emoji: '🎙️', name: 'ANCHOR', role: 'Rashtriya Chillane Wala', lines: ['DESH JAANNA CHAHTA HAI!', 'AAP JAWAB DIJIYE! JAWAB DIJIYE!', 'BREAK KE BAAD BHI YAHI CHALEGA!', 'MAIN AAPKO BOLNE NAHI DUNGA!'] }
  ],

  loading: [
    'Billi server chala rahi hai...',
    'Bakchodi synchronize ho rahi hai...',
    'Brain cells dhoondh rahe hain: 0 found',
    'Kalesh ka prasad tayyar ho raha hai...',
    'Mummy se chhupa ke load ho raha hai...',
    '“Bas ek minute” ka loading bar phir se atak gaya.',
    'Papa ne poocha kaunsi website hai. Alt-Tab ready rakho.',
    'GTA 6 se pehle load ho jayega. Promise.',
    'Aura recharge ho raha hai...'
  ],

  // Title ladder (admin-assigned titles override these)
  titles: [
    [0, 'Naya Nalla'],
    [10, 'Certified Yapper'],
    [30, 'Kalesh Correspondent'],
    [60, 'Minister of Unemployment'],
    [120, 'CEO of Yapping'],
    [250, 'Kalesh Samrat'],
    [500, 'Chronically Online Legend']
  ],

  submitLines: [
    'Aapka kalesh safaltapoorvak internet ko samarpit kar diya gaya hai.',
    'Unemployment contribution successfully registered.',
    'You have contributed to the downfall of productive discourse.',
    'Kalesh filed. Sootron ko inform kar diya gaya hai.'
  ],

  voteLines: ['SPICE REGISTERED. AAP CERTIFIED JUDGE HAIN.', 'MASALA METER UPDATED.', 'JUDGE SAHAB KA FAISLA AAYA.', 'COMBO! AAPKI RAAY DARJ HUI.'],

  emptyFeed: 'For the first time in history, everyone has shut up.',

  avatars: ['🐸', '🦆', '🐈', '🐱', '🗿', '💀', '👽', '🤡', '🥔', '🍟', '🐧', '🦖', '🐙', '🐒', '🍌', '🧃', '👹', '🎭', '🧒', '🦁', '🫠', '🤌', '🥸', '🐐']
};
