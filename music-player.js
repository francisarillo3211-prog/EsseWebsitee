document.addEventListener('DOMContentLoaded', function() {
    const T = [
        {
            title: "LuvDrug",
            artist: "Kacy",
            artwork: "assets/grahgrahboom.png",
            audioSrc: "assets/XTACY.wav"
        },
        {
            title: "Ghetto Love Calls",
            artist: "Slimescar",
            artwork: "assets/heybabysislimey.png",
            audioSrc: "assets/si_slime_tumatawag.mp3"
        },
        {
            title: "Grtt",
            artist: "Nio",
            artwork: "assets/albumninio.jpg",
            audioSrc: "assets/nio_grtt.mp3"
        },
        {
            title: "Kodak Blu",
            artist: "Gaspari777",
            artwork: "https://i.ytimg.com/vi/A1Oa_cod0_s/hqdefault.jpg?sqp=-oaymwEnCPYBEIoBSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLBWShD9hoAQaxUiK_L19xo38fN9Mg",
            audioSrc: "assets/KODAK BLU - gaspari (OLV).mp3"
        },
        {
            title: "Presidential",
            artist: "41",
            artwork: "https://i.scdn.co/image/ab67616d00001e0258fd2c31d3f28d82ece96fac",
            audioSrc: "https://audio.jukehost.co.uk/CtcXvRJTGxkKM1kWoCRidcSZTZZDd6CX"
        },
        {
            title: "Dugkat",
            artist: "Uncle Dags",
            artwork: "assets/undledags_dugkat.jpg",
            audioSrc: "assets/Uncle_Dags_Dugkat.mp3"
        },
    ];

    const A = document.getElementById('background-music'),
          P = document.getElementById('play-pause'),
          V = document.getElementById('prev-track'),
          N = document.getElementById('next-track'),
          L = document.getElementById('loop-track'),
          M = document.getElementById('mute-toggle'),
          S = document.getElementById('volume-slider'),
          B = document.getElementById('progress'),
          C = document.getElementById('current-time'),
          D = document.getElementById('duration'),
          I = document.getElementById('track-title'),
          R = document.getElementById('track-artist'),
          W = document.getElementById('track-artwork'),
          G = document.querySelector('.progress-bar');

    let i = 0, p = false, l = true;

    const FF = s => `${Math.floor(s/60)}:${Math.floor(s%60)<10?'0':''}${Math.floor(s%60)}`;
    
    const UU = () => P.innerHTML = `<i class="bx bx-${p?'pause':'play'}"></i>`;
    
    const LL = x => {
        x = x < 0 ? T.length-1 : x >= T.length ? 0 : x;
        i = x;
        A.src = T[i].audioSrc;
        I.textContent = T[i].title;
        R.textContent = T[i].artist;
        W.src = T[i].artwork;
        B.style.width = '0%';
        C.textContent = '0:00';
        A.load();
        p && A.play();
    };
    
    const TT = () => {
        if(A.paused) {A.play(); p=true;} else {A.pause(); p=false;}
        UU();
    };
    
    const UP = () => {
        if(A.duration) {
            B.style.width = `${(A.currentTime/A.duration)*100}%`;
            C.textContent = FF(A.currentTime);
            D.textContent = FF(A.duration);
        }
    };
    
    const SP = e => A.currentTime = (e.offsetX/G.clientWidth)*A.duration;
    
    const TP = () => {
        l = !l;
        A.loop = l;
        l ? L.classList.add('active') : L.classList.remove('active');
    };
    
    const MM = () => {
        A.muted = !A.muted;
        M.innerHTML = `<i class="bx bx-volume-${A.muted?'mute':'full'}"></i>`;
        localStorage.setItem('musicMuted', A.muted?'true':'false');
    };
    
    const SV = () => {
        A.volume = S.value/100;
        if(S.value === '0') {
            M.innerHTML = '<i class="bx bx-volume-mute"></i>';
        } else {
            M.innerHTML = '<i class="bx bx-volume-full"></i>';
            A.muted = false;
            localStorage.setItem('musicMuted', 'false');
        }
    };
    
    const PP = () => {
        LL(i);
        UU();
        A.volume = S.value/100;
        A.muted = localStorage.getItem('musicMuted')==='true';
        M.innerHTML = `<i class="bx bx-volume-${A.muted?'mute':'full'}"></i>`;
        A.loop = l;
        l && L.classList.add('active');
    };
    
    const HH = () => {
        if(A.muted && localStorage.getItem('musicMuted')!=='true') {
            A.muted = false;
            M.innerHTML = '<i class="bx bx-volume-full"></i>';
            if(A.paused) {A.play(); p=true; UU();}
        }
        document.removeEventListener('click', HH);
        document.removeEventListener('keydown', HH);
    };

    P.addEventListener('click', TT);
    V.addEventListener('click', () => LL(i-1));
    N.addEventListener('click', () => LL(i+1));
    L.addEventListener('click', TP);
    M.addEventListener('click', MM);
    S.addEventListener('input', SV);
    G.addEventListener('click', SP);
    
    A.addEventListener('timeupdate', UP);
    A.addEventListener('ended', () => !l && LL(i+1));
    A.addEventListener('canplay', () => D.textContent = FF(A.duration));
    
    document.addEventListener('keydown', e => {
        if(e.code === 'Space' && document.activeElement.tagName !== 'BUTTON' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            TT();
        }
    });

    PP();
    
    document.addEventListener('click', HH);
    document.addEventListener('keydown', HH);
});
