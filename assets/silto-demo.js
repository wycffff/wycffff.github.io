// Animated walkthrough of the Silto app: start, a Chinese and a Finnish turn,
// flip the Finnish view, enlarge the Chinese view, shrink it back, end.
(() => {
  const root = document.querySelector('[data-silto-demo]');
  if (!root) return;

  const $ = (s) => root.querySelector(s);
  const fiBody = $('.pane.fi .pane-body');
  const zhBody = $('.pane.zh .pane-body');
  const paneFi = $('.pane.fi');
  const screen = $('.screen');
  const mainBtn = $('.main-btn');
  const status = $('.status');
  const idle = $('.idle');
  const tap = $('.tap');
  const steps = [...root.querySelectorAll('.demo-steps li')];
  const replay = root.querySelector('.demo-replay');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  let run = 0;

  const turns = [
    { from: 'zh', src: '我这两天一直头疼，晚上也睡不好。', dst: 'Minulla on ollut päänsärkyä pari päivää, enkä nuku hyvin öisin.' },
    { from: 'fi', src: 'Onko teillä kuumetta? Otatteko jotain lääkkeitä?', dst: '您发烧吗？您在吃什么药吗？' },
    { from: 'zh', src: '没有发烧。我每天吃一片布洛芬，400 毫克。', dst: 'Ei kuumetta. Otan yhden ibuprofeenin päivässä, 400 milligrammaa.' },
    { from: 'fi', src: 'Selvä. Älkää ottako enempää kuin kolme tablettia päivässä.', dst: '好的。每天不要超过三片。' },
  ];

  function step(i) { steps.forEach((li, k) => li.classList.toggle('on', k === i)); }

  async function tapAt(el, id) {
    if (reduce) return;
    const r = el.getBoundingClientRect(), s = screen.getBoundingClientRect();
    tap.style.left = (r.left - s.left + r.width / 2) + 'px';
    tap.style.top = (r.top - s.top + r.height / 2) + 'px';
    tap.classList.remove('go'); void tap.offsetWidth; tap.classList.add('go');
    await wait(380);
    if (id !== run) throw new Error('stopped');
  }

  function entry(body, label, cls) {
    const box = document.createElement('div');
    box.className = 'entry ' + cls;
    box.innerHTML = `<span class="lab">${label}</span><p></p>`;
    body.appendChild(box);
    body.scrollTop = body.scrollHeight;
    return box.querySelector('p');
  }

  async function type(p, text, id, body) {
    p.classList.add('draft');
    const chunk = /[一-鿿]/.test(text) ? 1 : 3;
    for (let i = chunk; i <= text.length + chunk - 1; i += chunk) {
      if (id !== run) throw new Error('stopped');
      p.textContent = text.slice(0, i);
      body.scrollTop = body.scrollHeight;
      await wait(/[一-鿿]/.test(text) ? 95 : 55);
    }
    p.classList.remove('draft');
  }

  function reset() {
    fiBody.innerHTML = ''; zhBody.innerHTML = '';
    paneFi.classList.remove('flipped'); screen.classList.remove('zoom', 'live');
    idle.hidden = false; mainBtn.textContent = '▶ 开始'; status.textContent = '点击开始';
    step(-1);
  }

  async function play() {
    const id = ++run;
    reset();
    try {
      await wait(900);
      step(0); await tapAt(mainBtn, id);
      idle.hidden = true; screen.classList.add('live');
      mainBtn.textContent = '⏸ 暂停'; status.textContent = '··· 正在倾听';
      await wait(600);

      for (let t = 0; t < turns.length; t++) {
        const turn = turns[t];
        step(turn.from === 'zh' ? 1 : 2);
        const srcBody = turn.from === 'zh' ? zhBody : fiBody;
        const dstBody = turn.from === 'zh' ? fiBody : zhBody;
        const p = entry(srcBody, turn.from === 'zh' ? '原文' : 'Alkuperäinen', 'src');
        await type(p, turn.src, id, srcBody);
        await wait(450);
        const q = entry(dstBody, turn.from === 'zh' ? 'Käännös' : '译文', 'dst');
        q.textContent = turn.dst; q.classList.add('arrive');
        dstBody.scrollTop = dstBody.scrollHeight;
        await wait(1300);
        if (t === 1) {
          step(3); await tapAt($('.flip-btn'), id);
          paneFi.classList.add('flipped');
          await wait(1700);
          paneFi.classList.remove('flipped');
          await wait(600);
        }
      }

      step(4); await tapAt($('.zoom-btn'), id);
      screen.classList.add('zoom'); await wait(2200);
      await tapAt($('.zoom-btn'), id);
      screen.classList.remove('zoom'); await wait(900);

      step(5); await tapAt(mainBtn, id);
      screen.classList.remove('live');
      mainBtn.textContent = '▶ 开始'; status.textContent = '对话已结束 · 不保存录音';
      await wait(3200);
      if (id === run) play();
    } catch (e) { /* replaced by a newer run */ }
  }

  replay && replay.addEventListener('click', () => play());

  if (reduce) {
    // Static final state: show the whole conversation without animation.
    idle.hidden = true;
    turns.forEach((t) => {
      const sb = t.from === 'zh' ? zhBody : fiBody, db = t.from === 'zh' ? fiBody : zhBody;
      entry(sb, t.from === 'zh' ? '原文' : 'Alkuperäinen', 'src').textContent = t.src;
      entry(db, t.from === 'zh' ? 'Käännös' : '译文', 'dst').textContent = t.dst;
    });
    return;
  }
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); play(); }
  });
  io.observe(root);
})();
