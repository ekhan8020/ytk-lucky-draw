/* eslint-disable */
// Kiosk animation + sound engine. Ported from the approved prototype
// (YTK_LuckyDraw_Prototype.html) — timeline, particles and the synthesised
// "Y~T~K~" choir are unchanged. What differs: colours and switches come from
// the admin settings, and the prize comes from the server (api.requestPrize)
// instead of a local random pick.
import { shade, rgbTriplet, readableOn } from "../color";

export function createKioskEngine(root, api) {
  var $ = function (s) { return root.querySelector(s); };
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var muted = false, choirOn = true, state = "idle", destroyed = false;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  function readSettings() {
    var s = api.getSettings();
    muted = !s.soundEnabled;
    choirOn = s.choirEnabled;
    COLORS = [s.boxColor, shade(s.boxColor, 0.7), s.ribbonColor, "#ffffff", shade(s.boxColor, 0.35), s.ribbonColor];
    SPARK = [rgbTriplet(shade(s.boxColor, 0.85)), rgbTriplet(shade(s.boxColor, 0.45)), rgbTriplet(shade(s.ribbonColor, 0.35))];
    return s;
  }

  /* ---------- Sound (Web Audio, no files) ---------- */
  var audio=null,noiseBuf=null;
  function ac(){
    try{
      if(!audio){var C=window.AudioContext||window.webkitAudioContext;if(C)audio=new C()}
      if(audio&&audio.state==='suspended')audio.resume();
    }catch(e){audio=null}
    return audio;
  }
  function tone(f,t0,dur,type,vol,f2){
    var o=audio.createOscillator(),g=audio.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(f,t0);
    if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+dur);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(vol,t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g);g.connect(audio.destination);o.start(t0);o.stop(t0+dur+0.05);
  }
  function whoosh(t0,dur,vol,f1,f2){
    if(!noiseBuf){
      noiseBuf=audio.createBuffer(1,audio.sampleRate,audio.sampleRate);
      var d=noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    }
    var s=audio.createBufferSource();s.buffer=noiseBuf;s.loop=true;
    var f=audio.createBiquadFilter();f.type='bandpass';f.Q.value=1.2;
    f.frequency.setValueAtTime(f1,t0);f.frequency.exponentialRampToValueAtTime(f2,t0+dur);
    var g=audio.createGain();
    g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+dur*0.3);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    s.connect(f);f.connect(g);g.connect(audio.destination);s.start(t0);s.stop(t0+dur+0.05);
  }
  var sfx={
    rumble:function(){
      if(muted||!ac())return;var t=audio.currentTime;
      var o=audio.createOscillator(),g=audio.createGain(),f=audio.createBiquadFilter();
      o.type='sawtooth';o.frequency.setValueAtTime(48,t);o.frequency.linearRampToValueAtTime(95,t+1.05);
      f.type='lowpass';f.frequency.value=240;
      g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.2,t+0.9);g.gain.linearRampToValueAtTime(0.0001,t+1.08);
      o.connect(f);f.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+1.1);
      for(var i=0;i<12;i++)tone(320+i*45,t+i*0.085,0.045,'square',0.03+i*0.004);
    },
    pop:function(){
      if(muted||!ac())return;var t=audio.currentTime;
      whoosh(t,0.6,0.28,500,3200);tone(520,t,0.22,'sine',0.25,90);
    },
    shimmer:function(){
      if(muted||!ac())return;var t=audio.currentTime;
      var n=[523.25,659.25,783.99,1046.5,1318.5,1568,2093];
      for(var i=0;i<n.length;i++)tone(n[i],t+0.1+i*0.19,0.5,'triangle',0.07);
    },
    chime:function(){
      if(muted||!ac())return;var t=audio.currentTime;
      var n=[1046.5,1318.5,1568,2093];
      for(var i=0;i<n.length;i++){tone(n[i],t+i*0.09,1.3,'triangle',0.12);tone(n[i]*2,t+i*0.09,0.8,'sine',0.03)}
      tone(130.8,t,0.9,'sine',0.18);
    }
  };


  /* ---------- Choir: "Y ~ T ~ K ~" ----------
     SATB ensemble: every part is several slightly different voices (own pitch, vibrato, entry time)
     sharing one set of vowel formants. Formant synthesis, no audio files. */
  var VOW={oo:[300,870,2240],ah:[730,1090,2440],ee:[270,2290,3010],eh:[530,1840,2480]};
  var PARTS=[
    {name:'bass',   n:4, scale:0.92, vol:1.05, male:true},
    {name:'tenor',  n:4, scale:1.00, vol:0.95, male:true},
    {name:'alto',   n:5, scale:1.12, vol:0.85, male:false},
    {name:'soprano',n:5, scale:1.20, vol:0.80, male:false}
  ];
  function makeReverb(ctx,out){
    var len=Math.floor(ctx.sampleRate*2.8),ir=ctx.createBuffer(2,len,ctx.sampleRate);
    for(var c=0;c<2;c++){var d=ir.getChannelData(c),lp=0;
      for(var i=0;i<len;i++){lp+=((Math.random()*2-1)-lp)*0.55;d[i]=lp*Math.pow(1-i/len,2.3)}}
    var cv=ctx.createConvolver();cv.buffer=ir;
    var w=ctx.createGain();w.gain.value=0.55;cv.connect(w);w.connect(out);return cv;
  }
  function glottal(ctx){
    var N=48,re=new Float32Array(N),im=new Float32Array(N);
    for(var n=1;n<N;n++)im[n]=1/Math.pow(n,1.45);
    return ctx.createPeriodicWave(re,im);
  }
  function burst(ctx,out,t,kind){
    var n=Math.floor(ctx.sampleRate*0.09),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
    for(var i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
    var s=ctx.createBufferSource();s.buffer=b;
    var f=ctx.createBiquadFilter();
    if(kind==='t'){f.type='highpass';f.frequency.value=5200}else{f.type='bandpass';f.frequency.value=2100;f.Q.value=1.1}
    var g=ctx.createGain();g.gain.value=kind==='t'?0.4:0.55;
    s.connect(f);f.connect(g);g.connect(out);s.start(t);
  }
  function rnd(a,b){return a+Math.random()*(b-a)}

  function sing(ctx,t0,out){
    var bus=ctx.createGain();bus.gain.value=0.62;
    var comp=ctx.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=3;comp.attack.value=0.02;
    bus.connect(comp);comp.connect(out);
    var rev=makeReverb(ctx,out);
    var wave=glottal(ctx);
    var SYL=[
      {t:0,   dur:0.64,chord:[130.8,261.6,329.6,392],  vow:[[0,'oo'],[0.10,'ah'],[0.40,'ee']],cons:null},
      {t:0.64,dur:0.62,chord:[174.6,261.6,349.2,440],  vow:[[0,'ee']],cons:'t'},
      {t:1.26,dur:1.90,chord:[130.8,329.6,392,523.3],  vow:[[0,'eh'],[0.35,'ee']],cons:'k',cresc:true}
    ];
    var END=t0+3.5;

    PARTS.forEach(function(P,pi){
      var pb=ctx.createGain();pb.gain.value=1;            /* part bus: sum of this part's voices */
      /* vowel formants shared by the part, automated through the three syllables */
      var out2=ctx.createGain();out2.gain.value=P.vol;
      [0,1,2].forEach(function(i){
        var bp=ctx.createBiquadFilter();bp.type='bandpass';bp.Q.value=[5,11,14][i];
        var first=SYL[0].vow[0][1];
        bp.frequency.setValueAtTime(VOW[first][i]*P.scale,t0);
        SYL.forEach(function(s){s.vow.forEach(function(v,k){
          if(s===SYL[0]&&k===0)return;
          bp.frequency.setTargetAtTime(VOW[v[1]][i]*P.scale,t0+s.t+v[0],0.06);
        })});
        var g=ctx.createGain();g.gain.value=[1,0.55,0.28][i];
        pb.connect(bp);bp.connect(g);g.connect(out2);
      });
      /* body: low harmonics that the narrow formants would otherwise remove */
      var low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=800;
      var lg=ctx.createGain();lg.gain.value=0.45;pb.connect(low);low.connect(lg);lg.connect(out2);
      /* singer's formant: the ring that lets a choir cut through */
      var sf=ctx.createBiquadFilter();sf.type='peaking';sf.frequency.value=P.male?2800:3200;sf.gain.value=P.male?6:3;sf.Q.value=1.2;
      out2.connect(sf);sf.connect(bus);
      var send=ctx.createGain();send.gain.value=0.8;sf.connect(send);send.connect(rev);

      /* breath, pushed through the same formants */
      var nb=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),nd=nb.getChannelData(0);
      for(var q=0;q<nd.length;q++)nd[q]=Math.random()*2-1;
      var ns=ctx.createBufferSource();ns.buffer=nb;ns.loop=true;
      var ng=ctx.createGain();ng.gain.value=0.035;ns.connect(ng);ng.connect(pb);ns.start(t0);ns.stop(END);

      /* the individual singers */
      for(var v=0;v<P.n;v++){
        var drift=rnd(-14,14),vibRate=rnd(4.8,6.2),vibDepth=rnd(10,22),late=rnd(0,0.05);
        SYL.forEach(function(s){
          var f=s.chord[pi],ts=t0+s.t+late,dur=s.dur,end=ts+dur+0.38;
          var o=ctx.createOscillator();o.setPeriodicWave(wave);
          o.frequency.setValueAtTime(f*0.975,ts);o.frequency.linearRampToValueAtTime(f,ts+0.09);
          o.detune.value=drift;
          var lfo=ctx.createOscillator(),lgn=ctx.createGain();
          lfo.frequency.value=vibRate;
          lgn.gain.setValueAtTime(0,ts);lgn.gain.linearRampToValueAtTime(vibDepth,ts+dur*0.7);
          lfo.connect(lgn);lgn.connect(o.detune);
          var env=ctx.createGain(),amp=0.16*rnd(0.8,1.1);
          env.gain.setValueAtTime(0.0001,ts);
          env.gain.linearRampToValueAtTime(amp,ts+0.09);
          env.gain.linearRampToValueAtTime(s.cresc?amp*1.45:amp,ts+dur*0.8);
          env.gain.linearRampToValueAtTime(0.0001,end);
          o.connect(env);env.connect(pb);
          o.start(ts);o.stop(end+0.05);lfo.start(ts);lfo.stop(end+0.05);
        });
      }
    });
    SYL.forEach(function(s){if(s.cons)burst(ctx,bus,t0+s.t-0.012,s.cons)});
  }
  function singYTK(){
    if(muted||!choirOn||!ac())return false;
    var m=audio.createGain();m.gain.value=0.9;m.connect(audio.destination);
    sing(audio,audio.currentTime+0.02,m);return true;
  }

  /* ---------- Particles ---------- */
  var cv=$('#fx'),cx=cv.getContext('2d'),W=0,H=0,parts=[];
  var COLORS=['#f5c242','#fff3c4','#e14b4b','#ffffff','#ffd77a','#e14b4b'];
  var SPARK=['255,246,214','255,214,120','255,120,100'];
  function resize(){
    var d=Math.min(window.devicePixelRatio||1,2);
    W=window.innerWidth;H=window.innerHeight;
    cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0);
    parts=parts.filter(function(p){return p.t!=='d'});
    for(var i=0;i<28;i++)parts.push({t:'d',x:rand(0,W),y:rand(0,H),vx:rand(-6,6),vy:rand(-14,-4),r:rand(1,2.6),life:rand(0,6),max:Infinity});
  }
  function emitConfetti(x,y,n,dir,spread,smin,smax){
    n=Math.round(n*(RM?0.4:1));
    for(var i=0;i<n;i++){
      var a=dir+(Math.random()-0.5)*spread,s=rand(smin,smax);
      parts.push({t:'c',x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,rot:rand(0,6.28),vr:rand(-9,9),
        w:rand(6,12),h:rand(10,18),col:COLORS[Math.floor(Math.random()*COLORS.length)],ph:rand(0,6.28),life:0,max:rand(2.6,3.8)});
    }
  }
  function emitSpark(x,y,n,k){
    var cols=SPARK;
    for(var i=0;i<n;i++){
      var a=-Math.PI/2+(Math.random()-0.5)*1.5,s=rand(160,430);
      parts.push({t:'s',x:x+rand(-60,60)*k,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:rand(2,5),
        col:cols[Math.floor(Math.random()*cols.length)],life:0,max:rand(0.6,1.2)});
    }
  }
  var raf=0,last=performance.now();
  function tick(now){
    var dt=Math.min(0.033,(now-last)/1000);last=now;
    cx.clearRect(0,0,W,H);
    for(var i=parts.length-1;i>=0;i--){
      var p=parts[i];p.life+=dt;
      if(p.life>p.max){parts.splice(i,1);continue}
      if(p.t==='c'){
        p.vy+=900*dt;p.vx*=1-1.5*dt;p.vy*=1-1.1*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
        cx.save();cx.translate(p.x,p.y);cx.rotate(p.rot);cx.scale(1,Math.cos(p.ph+p.life*9));
        cx.globalAlpha=Math.min(1,(p.max-p.life)*2);cx.fillStyle=p.col;
        cx.fillRect(-p.w/2,-p.h/2,p.w,p.h);cx.restore();
      }else if(p.t==='s'){
        p.vy+=120*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
        var al=1-p.life/p.max;
        cx.globalCompositeOperation='lighter';
        cx.fillStyle='rgba('+p.col+','+(al*0.28)+')';cx.beginPath();cx.arc(p.x,p.y,p.r*3,0,6.283);cx.fill();
        cx.fillStyle='rgba('+p.col+','+al+')';cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.283);cx.fill();
        cx.globalCompositeOperation='source-over';
      }else{
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.y<-10){p.y=H+10;p.x=rand(0,W)}
        if(p.x<-10)p.x=W+10;if(p.x>W+10)p.x=-10;
        cx.fillStyle='rgba(255,230,160,'+(0.18+0.22*Math.abs(Math.sin(p.life*1.3)))+')';
        cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.283);cx.fill();
      }
    }
    raf=requestAnimationFrame(tick);
  }
  window.addEventListener('resize',resize);
  resize();raf=requestAnimationFrame(tick);


  /* ---------- Scene ---------- */
  var stage = $("#stage"), box = $("#box"), lid = $("#lid"), base = $("#base"), inner = $("#inner"),
      hole = $("#hole"), halo = $("#halo"), beam = $("#beam"), rays = $("#rays"), flash = $("#flash"),
      btn = $("#open"), popup = $("#popup"), card = $("#card");

  /* Keep every fill-forwards animation we start so reset can cancel them all (el.getAnimations() misses finished ones in some engines). */
  var live = [];
  function A(el, kf, opts) { var a = el.animate(kf, opts); live.push(a); return a; }

  function opening() {
    var r = stage.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: r.top + r.height * (215 / 420), k: r.width / 400 };
  }
  function shakeFrames(amp) {
    var f = [], n = 16;
    for (var i = 0; i <= n; i++) {
      var k = i / n, a = (1.5 + k * 7) * amp, sgn = i % 2 ? 1 : -1;
      f.push({ offset: k, transform: "translate(" + (sgn * a).toFixed(1) + "px," + (rand(-1, 1) * a * 0.3).toFixed(1) + "px) rotate(" + (sgn * a * 0.35).toFixed(2) + "deg)" });
    }
    f[f.length - 1].transform = "translate(0,0) rotate(0deg)";
    return f;
  }

  /* Optional uploaded choir recording replaces the synthesised one. */
  var choirBuf = null, choirBufUrl = null;
  function loadChoirFile(url) {
    if (!url || choirBufUrl === url) return;
    choirBufUrl = url; choirBuf = null;
    ac();
    if (!audio) return;
    fetch(url).then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (res, rej) { audio.decodeAudioData(ab, res, rej); }); })
      .then(function (b) { if (choirBufUrl === url) choirBuf = b; })
      .catch(function () { choirBuf = null; });
  }
  function playChoirFile() {
    if (!choirBuf || !audio) return false;
    var s = audio.createBufferSource(); s.buffer = choirBuf; s.connect(audio.destination); s.start();
    return true;
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16);
    });
  }

  async function openBox() {
    if (state !== "idle" || destroyed || !api.isAvailable()) return;
    state = "busy"; ac();
    var cfg = readSettings();
    if (!muted && cfg.choirEnabled && cfg.choirAudioUrl) loadChoirFile(cfg.choirAudioUrl);
    btn.disabled = true; stage.classList.add("busy");
    var prizeP = api.requestPrize();          /* decided on the server, before any animation */
    sfx.rumble();
    await A(box, shakeFrames(RM ? 0.3 : 1), { duration: 1050, easing: "linear" }).finished;

    sfx.pop();
    var o = opening();
    A(hole, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, fill: "forwards" });
    A(lid, [
      { transform: "translate(0,0) rotate(0deg)" },
      { transform: "translate(-6px,-235px) rotate(-16deg)", offset: 0.7 },
      { transform: "translate(-12px,-255px) rotate(-22deg)" }
    ], { duration: 950, easing: "cubic-bezier(.15,.8,.25,1)", fill: "forwards" });
    A(base, [
      { transform: "scale(1.05,0.9)" }, { transform: "scale(.98,1.03)", offset: 0.5 }, { transform: "scale(1,1)" }
    ], { duration: 600, easing: "ease-out" });
    A(inner, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: "forwards" });
    A(beam, [
      { transform: "translate(-50%,-100%) scaleY(0)", opacity: 0 },
      { transform: "translate(-50%,-100%) scaleY(1)", opacity: 1 }
    ], { duration: 800, easing: "ease-out", fill: "forwards" });
    A(halo, [
      { transform: "translate(-50%,-50%) scale(.15)", opacity: 0 },
      { transform: "translate(-50%,-50%) scale(.7)", opacity: 0.9, offset: 0.35 },
      { transform: "translate(-50%,-50%) scale(3.2)", opacity: 1 }
    ], { duration: 1600, easing: "ease-in", fill: "forwards" });
    rays.classList.add("on");
    emitSpark(o.x, o.y, RM ? 10 : 46, o.k);
    sfx.shimmer();
    var spk = setInterval(function () { var q = opening(); emitSpark(q.x, q.y, RM ? 1 : 3, q.k); }, 45);
    await sleep(1550);
    clearInterval(spk);

    var result = await prizeP;      /* the glow holds here until the server has answered */
    if (destroyed) return;
    var good = result.kind === "prize";
    var sang = false;
    if (good) {
      if (!muted && choirOn && playChoirFile()) sang = true;
      else sang = singYTK();
    }
    await A(flash, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, fill: "forwards" }).finished;
    showPopup(result, cfg);
    A(flash, [{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 60, fill: "forwards" });
    if (good) {
      if (sang) setTimeout(sfx.chime, 1300); else sfx.chime();
      emitConfetti(W * 0.5, H * 0.42, 90, -Math.PI / 2, Math.PI * 0.9, 500, 1100);
      emitConfetti(0, H * 0.75, 50, -Math.PI / 3, 0.9, 700, 1300);
      emitConfetti(W, H * 0.75, 50, -Math.PI * 2 / 3, 0.9, 700, 1300);
    }
    state = "popup";
  }

  function showPopup(r, cfg) {
    var chip = $("#pz-tier"), congrats = $("#pz-congrats"), hint = $("#pz-hint"), name = $("#pz-name");
    if (r.kind === "prize") {
      var p = r.prize;
      chip.hidden = !p.tier; chip.textContent = p.tier; chip.style.background = p.color; chip.style.color = readableOn(p.color);
      congrats.hidden = false; hint.hidden = false; hint.textContent = cfg.popupHint;
      name.textContent = p.name;
    } else if (r.kind === "sold_out") {
      chip.hidden = true; congrats.hidden = true; hint.hidden = true;
      name.textContent = cfg.soldOutMessage;
    } else {
      chip.hidden = true; congrats.hidden = true; hint.hidden = false;
      name.textContent = "Sorry, something went wrong";
      hint.textContent = "Please tap DONE and try again.";
    }
    popup.hidden = false;
    card.animate([
      { transform: "scale(.5) translateY(30px)", opacity: 0 },
      { transform: "scale(1.05) translateY(0)", opacity: 1, offset: 0.65 },
      { transform: "scale(1)", opacity: 1 }
    ], { duration: 650, easing: "cubic-bezier(.3,.9,.3,1)" });
  }

  function resetScene() {
    live.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    live = [];
    [box, lid, base, hole, inner, beam, halo, flash].forEach(function (el) { el.getAnimations().forEach(function (a) { a.cancel(); }); });
    rays.classList.remove("on");
    popup.hidden = true;
    stage.classList.remove("busy");
    btn.disabled = false; state = "idle";
    stage.animate([{ transform: "scale(.8)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.34,1.56,.64,1)" });
    api.onIdle();
  }

  var onBtn = function () { openBox(); };
  var onDone = function () { resetScene(); };
  btn.addEventListener("click", onBtn);
  stage.addEventListener("click", onBtn);
  $("#done").addEventListener("click", onDone);
  readSettings();

  return {
    newToken: uuid,
    destroy: function () {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      btn.removeEventListener("click", onBtn);
      stage.removeEventListener("click", onBtn);
      $("#done").removeEventListener("click", onDone);
      try { if (audio && audio.close) audio.close(); } catch (e) {}
    },
    applySettings: readSettings,
  };
}
