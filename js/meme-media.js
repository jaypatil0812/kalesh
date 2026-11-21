// Curated from memes.csv. The GIF rows listed articles, so their media files
// are from GIPHY (Nyan Cat) and BetterTTV (CatJAM).
window.KALESH_MEDIA = [
  ['📺', 'Dekh Raha Hai Binod', 'Binod, phir se debate shuru.', 'serial', 'binod.jpg', 'binod.jpg', 'https://www.postoast.com/dekh-raha-hai-binod-memes/', 'G045'],
  ['🌈', 'Nyan Cat', 'Pixel cat, Pop-Tart body, rainbow trail.', 'powerup', 'nyan.gif', 'nyan.png', 'https://thediscerningcat.com/funny-cat-memes/', 'K0002'],
  ['♫', 'Vibing Cat / CatJAM', 'Cat bobbing its head to music.', 'pop', 'catjam.gif', 'catjam.png', 'https://trending.knowyourmeme.com/editorials/collections/the-real-cats-behind-10-of-the-most-iconic-cat-memes-on-the-internet', 'K0016'],
  ['🐈', 'Woman Yelling at a Cat', 'Smudge has heard enough.', 'serial', 'smudge.jpg', 'smudge.jpg', 'https://i.imgflip.com/345v97.jpg', 'K0365'],
  ['👀', 'Monkey Puppet', 'When the group chat goes quiet.', 'bruh', 'monkey.jpg', 'monkey.jpg', 'https://i.imgflip.com/2gnnjh.jpg', 'K0384'],
  ['💡', 'Roll Safe', 'You can’t lose the argument if you never stop replying.', 'coin', 'rollsafe.jpg', 'rollsafe.jpg', 'https://i.imgflip.com/1h7in3.jpg', 'K0381'],
  ['🐕', 'Buff Doge vs. Cheems', 'Two gangs, one extremely unnecessary rivalry.', 'roar', 'doge.png', 'doge.png', 'https://i.imgflip.com/43a45p.png', 'K0375'],
  ['🔥', 'Disaster Girl', 'The comments were like this when I got here.', 'boom', 'disaster.png', 'disaster.png', 'https://api.memegen.link/images/disastergirl.png', 'K0203'],
  ['☕', 'Hide the Pain Harold', 'Absolutely enjoying this discourse.', 'sad', 'harold.png', 'harold.png', 'https://api.memegen.link/images/harold.png', 'K0239'],
  ['🐈', 'Pop Cat', 'One pop for every unnecessary reply.', 'pop', 'popcat.gif', 'popcat.png', 'https://tenor.com/view/oatmeal-meme-pop-cat-popping-cat-poggers-gif-1422903012547548053', 'G004']
].map(([icon, title, caption, sound, file, still, source, id]) =>
  [icon, title, caption, sound, 'assets/memes/' + file, 'assets/memes/' + still, source, id]
);
