document.addEventListener('DOMContentLoaded', function() {
    const m = [
    { name: 'owa', discordId: '285061795029450754', profileUrl: ''},
    { name: 'laquica', discordId: '1493813478673219787', profileUrl: ''},
    { name: 'raven', discordId: '285061795029450754', profileUrl:' '},
    { name: 'penta', discordId: '285061795029450754', profileUrl: ''},
    { name: 'francis', discordId: '285061795029450754', profileUrl: ''},
    { name: 'dikya', discordId: 'INSERT_DISCORD_ID_HERE', profileUrl: ''},
];

    function FF(b) {
        fetch(`https://api.lanyard.rest/v1/users/${b.discordId}`)
            .then(r => r.json())
            .then(d => {
                if (!d.success) {
                    console.error('Failed to fetch Discord profile');
                    return;
                }
                
                const i = `activity-${b.name}`;
                const e = document.getElementById(i);
                const u = d.data;
                const a = `https://cdn.discordapp.com/avatars/${b.discordId}/${u.discord_user.avatar}?size=256`;
                
                const c = document.querySelector(`.fame-member[data-userid="${b.discordId}"] .avatar-container`);
                let g = c.querySelector('.avatar');
                if (!g) {                        
                    g = document.createElement('img');
                    g.className = 'avatar';
                    g.alt = u.discord_user.username;
                    c.prepend(g);
                }
                g.src = a;
                
                let h = `
                <div class="discord-profile">
                    <div class="profile-header">
                        <img class="profile-avatar" src="${a}" alt="Discord Avatar">
                        <div class="profile-info">
                            <div class="profile-username">${u.discord_user.username}</div>
                            <div class="profile-status ${u.discord_status}">
                                <span class="status-indicator"></span>
                                ${u.discord_status}
                            </div>
                        </div>
                    </div>`;
                
                if (u.spotify) {
                    const s = u.spotify;
                    let p = 0;
                    
                    if (s.timestamps) {
                        const t = s.timestamps.start;
                        const n = s.timestamps.end;
                        const l = Date.now() - t;
                        p = Math.min(100, Math.max(0, (l / (n - t)) * 100));
                    }
                    
                    h += `
                        <div class="spotify-activity">
                            <div class="spotify-header">
                                <i class='bx bxl-spotify spotify-icon'></i>
                                <span>Listening to Spotify</span>
                            </div>
                            <div class="spotify-content">
                                <img class="album-art" src="${s.album_art_url}" alt="Album Art">
                                <div class="spotify-info">
                                    <div class="song-title">${s.song}</div>
                                    <div class="song-artist">by ${s.artist}</div>
                                    <div class="song-album">on ${s.album}</div>
                                </div>
                            </div>
                            <div class="spotify-progress">
                                <div class="spotify-progress-bar" style="width: ${p}%"></div>
                            </div>
                        </div>`;
                }
                
                if (u.discord_status !== "offline" && u.activities) {
                    const o = u.activities.find(v => v.type === 4);
                    if (o && o.state) {
                        let j = '';
                        if (o.emoji) {
                            if (o.emoji.id) {
                                const z = o.emoji.animated ? 'gif' : 'png';
                                j = `<img class="status-emoji-img" src="https://cdn.discordapp.com/emojis/${o.emoji.id}.${z}" alt="${o.emoji.name}">`;
                            } else {
                                j = `<span class="status-emoji">${o.emoji.name}</span>`;
                            }
                        }
                        
                        h += `
                            <div class="custom-status">
                                ${j}
                                <span class="status-text">${o.state}</span>
                            </div>`;
                    }
                }
                
                if (u.activities && u.activities.length > 0) {
                    const q = u.activities.filter(v => 
                        (v.type === 0 || v.type === 1 || v.type === 3) || 
                        (v.type === 2 && v.name !== 'Spotify')
                    );
                    
                    if (q.length > 0) {
                        h += '<div class="profile-activities">';
                        
                        q.forEach(v => {
                            const y = ["Playing", "Streaming", "Listening to", "Watching", ""];
                            const k = y[v.type] || "";
                            
                            h += `<div class="activity-item">`;
                            
                            if (v.assets && v.assets.large_image) {
                                let x = v.assets.large_image;
                                if (x.startsWith('mp:')) {
                                    x = `https://media.discordapp.net/${x.replace('mp:', '')}`;
                                } else if (v.application_id) {
                                    x = `https://cdn.discordapp.com/app-assets/${v.application_id}/${x}.png`;
                                }
                                h += `<img class="activity-icon" src="${x}" onerror="this.style.display='none'">`;
                            }
                            
                            h += `<div class="activity-details">
                                <div class="activity-name">${k} ${v.name}</div>`;
                            
                            if (v.details) {
                                h += `<div class="activity-detail">${v.details}</div>`;
                            }
                            
                            if (v.state) {
                                h += `<div class="activity-state">${v.state}</div>`;
                            }
                            
                            if (v.timestamps && v.timestamps.start) {
                                const w = Math.floor((Date.now() - v.timestamps.start) / (1000 * 60));
                                const t = w >= 60 
                                    ? `${Math.floor(w / 60)}h ${w % 60}m` 
                                    : `${w}m`;
                                
                                h += `<div class="activity-time">Elapsed: ${t}</div>`;
                            }
                            
                            h += `</div></div>`;
                        });
                        
                        h += '</div>';
                    }
                } else if (u.discord_status !== "offline") {
                    h += '<div class="no-activity">No current activity</div>';
                }
                
                h += '</div>';
                e.innerHTML = h;
                
                e.style.cursor = 'pointer';
                e.onclick = function() {
                    window.location.href = b.profileUrl;
                };
            })
            .catch(error => {
                console.error('Error fetching Discord profile:', error);
            });
    }

    m.forEach(b => {
        FF(b);
    });

    setInterval(() => {
        m.forEach(b => {
            FF(b);
        });
    }, 30000);
});
