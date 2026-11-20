const d = {};

const r = {};

const GG = t => ['Playing', 'Streaming', 'Listening to', 'Watching', 'Custom Status:', 'Competing in'][t] || 'Playing';

const UU = (i, m, s) => {
    if (!i || i.length === 0) {
        const container = document.querySelector(s);
        if (container) container.innerHTML = '';
        return;
    }
    Promise.all(i.map(userId =>
        fetch(`https://api.lanyard.rest/v1/users/${userId}`)
            .then(response => {
                if (!response.ok) {
                    console.warn(`Lanyard API returned status ${response.status} for user ${userId}`);
                    return response.json()
                        .then(json => ({ ...json, userId: userId }))
                        .catch(() => ({ success: false, error: `Status: ${response.status}`, userId: userId }));
                }
                return response.json().then(json => ({ ...json, userId: userId }));
            })
            .catch(error => {
                console.error(`Error fetching Lanyard data for user ${userId}:`, error);
                return { success: false, error: error.message, userId: userId };
            })
    ))
        .then(results => {
            const resultsMap = new Map(results.map(result => [result?.userId || result?.data?.discord_user?.id, result]));

            const html = i.map(userId => {
                const result = resultsMap.get(userId);
                const data = result?.success ? result.data : null;
                const discord_user = data?.discord_user;
                const discord_status = data?.discord_status || 'offline';
                const activities = data?.activities;
                const spotify = data?.spotify;
                const userName = m[userId];
                const profileUrl = userName ? `#${userName.toLowerCase()}` : (discord_user ? `https://discord.com/users/${discord_user.id}` : '#');
                const clickHandler = userName ? `onclick="event.preventDefault(); openProfile('${userName.toLowerCase()}')"` : '';

                let activityHtml = '';
                let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';

                if (discord_user && discord_user.avatar) {
                    avatarUrl = `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.png`;
                } else if (discord_user && discord_user.discriminator) {
                    const defaultAvatarId = parseInt(discord_user.discriminator) % 5;
                    avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarId}.png`;
                }


                if (data) {
                    if (spotify) {
                        activityHtml = `<div class="activity-details">
                        <div class="activity-type"><i class="fab fa-spotify"></i> Listening to Spotify</div>
                        <div class="activity-name">${spotify.song}</div>
                        <div class="activity-info">by ${spotify.artist}</div>
                    </div>`;
                    } else if (activities?.length > 0) {
                        const customStatus = activities.find(activity => activity.type === 4);
                        const otherActivities = activities.filter(activity => activity.type !== 4 && activity.name !== 'Spotify');

                        if (customStatus) {
                            activityHtml += `<div class="activity-details">
                            <div class="activity-type">
                                ${customStatus.emoji?.id ?
                                    `<img src="https://cdn.discordapp.com/emojis/${customStatus.emoji.id}${customStatus.emoji.animated ? '.gif' : '.png'}" alt="emoji" style="width: 20px; height: 20px;">` : ''}
                                ${customStatus.state || ''}
                            </div>
                        </div>`;
                        }

                        if (otherActivities.length > 0) {
                            otherActivities.forEach(activity => {
                                activityHtml += `<div class="activity-details">
                                <div class="activity-type">${GG(activity.type)} ${activity.name}</div>
                                ${activity.details ? `<div class="activity-info">${activity.details}</div>` : ''}
                                ${activity.state ? `<div class="activity-state">${activity.state}</div>` : ''}
                                ${activity.timestamps && activity.timestamps.start ?
                                        `<div class="activity-time">Elapsed: ${Math.floor((Date.now() - activity.timestamps.start) / 60000)} minutes</div>` : ''}
                            </div>`;
                            });
                        }
                    }
                } else {
                    activityHtml = '<div class="activity-details">Could not load status</div>';
                }


                const matchedMember = (typeof members !== 'undefined' && Array.isArray(members))
                    ? members.find(mem => mem.discordId === userId || mem.username === (userName || '').toLowerCase())
                    : null;
                const displayName = matchedMember?.name || discord_user?.global_name || discord_user?.username || userName || `User ${userId}`;

                if (!activityHtml) {
                    activityHtml = `<div class="activity-details">${discord_status.charAt(0).toUpperCase() + discord_status.slice(1)}</div>`;
                }

                const popupHtml = `<div class="activity-details" style="font-weight:700; color:#fff; margin-bottom:4px;">${displayName}</div>${activityHtml}`;

                return `<a href="${profileUrl}" ${clickHandler} class="trail-btn">
                <div class="trail-avatar-wrap">
                    <img src="${avatarUrl}" alt="${displayName}'s Avatar">
                    <span class="status ${discord_status}"></span>
                </div>
                <span class="trail-name">${displayName}</span>
                <div class="presence-popup">${popupHtml}</div>
            </a>`;
            }).join('');

            const container = document.querySelector(s);
            if (container) {
                container.innerHTML = html;
            } else {
                console.error(`Container with selector ${s} not found.`);
            }
        })
        .catch(error => {
            console.error('Error processing Lanyard data results:', error);
            const container = document.querySelector(s);
            if (container) {
                const html = i.map(userId => {
                    const userName = m[userId];
                    return `<a href="${userName ? `#${userName.toLowerCase()}` : `#`}" ${userName ? `onclick="event.preventDefault(); openProfile('${userName.toLowerCase()}')"` : ''} class="trail-btn">
                    <div class="trail-avatar-wrap">
                        <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="${userName || 'User'}'s Avatar">
                        <span class="status offline"></span>
                    </div>
                    <span class="trail-name">${userName || `User ${userId}`}</span>
                    <div class="presence-popup">Could not load status</div>
                </a>`;
                }).join('');
                container.innerHTML = html;
            } else {
                console.error(`Container with selector ${s} not found for error fallback.`);
            }
        });
};

const FF = () => {
    const ogMap = { ...d };
    const membersMap = { ...r };

    if (typeof members !== 'undefined' && Array.isArray(members)) {
        members.forEach(m => {
            if (m.section === 'og' && m.discordId) {
                ogMap[m.discordId] = m.username;
            } else if (m.section === 'members' && m.discordId) {
                membersMap[m.discordId] = m.username;
            }
        });
    }

    UU(Object.keys(ogMap), ogMap, '.button-trail-left');
    UU(Object.keys(membersMap), membersMap, '.button-trail-right');
};
window.FF = FF;

const EE = () => {
    const b = document.getElementById('background-music');
    const t = document.getElementById('music-toggle');

    if (b) {
        b.volume = 0.3;
    } else {
        console.error("Background music element not found.");
    }


    if (t) {
        t.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (b && b.paused) {
                b.play();
                t.innerHTML = "<i class='bx bx-music'></i>";
            } else if (b) {
                b.pause();
                t.innerHTML = "<i class='bx bx-music-off'></i>";
            }
        });
    }
};

const DISCORD_GUILD_ID = '1512180057894817832';
let discordWidgetMembers = [];

function renderDiscordMembersGrid(filterText = '') {
    const grid = document.getElementById('discord-members-grid');
    if (!grid) return;

    const query = filterText.trim().toLowerCase();
    const list = query
        ? discordWidgetMembers.filter(m => (m.username || '').toLowerCase().includes(query))
        : discordWidgetMembers;

    grid.innerHTML = '';

    if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'discord-loading';
        empty.textContent = query ? 'No matching online members.' : 'No online members right now.';
        grid.appendChild(empty);
        return;
    }

    list.forEach(m => {
        const tile = document.createElement('div');
        tile.className = 'discord-member-tile';
        if (m.game && m.game.name) {
            tile.title = `Playing ${m.game.name}`;
        }

        const wrap = document.createElement('div');
        wrap.className = 'discord-member-avatar-wrap';

        const img = document.createElement('img');
        img.className = 'discord-member-avatar';
        img.src = m.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';
        img.alt = m.username || 'Member';
        img.loading = 'lazy';

        const statusDot = document.createElement('span');
        statusDot.className = `discord-member-status ${m.status || 'offline'}`;

        wrap.appendChild(img);
        wrap.appendChild(statusDot);

        const nameEl = document.createElement('span');
        nameEl.className = 'discord-member-username';
        nameEl.textContent = m.username || 'Member';

        tile.appendChild(wrap);
        tile.appendChild(nameEl);

        if (m.game && m.game.name) {
            const gameEl = document.createElement('span');
            gameEl.className = 'discord-member-game';
            gameEl.textContent = m.game.name;
            tile.appendChild(gameEl);
        }

        grid.appendChild(tile);
    });
}

async function loadDiscordWidget() {
    try {
        const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`);
        if (!res.ok) throw new Error(`Widget status ${res.status}`);
        const data = await res.json();

        const nameEl = document.getElementById('discord-server-name');
        const onlineEl = document.getElementById('discord-online-count');
        const moreNote = document.getElementById('discord-more-note');

        if (nameEl && data.name) nameEl.textContent = data.name;
        if (onlineEl) onlineEl.textContent = data.presence_count ?? (data.members ? data.members.length : 0);

        discordWidgetMembers = Array.isArray(data.members) ? data.members : [];
        const searchEl = document.getElementById('discord-member-search');
        renderDiscordMembersGrid(searchEl ? searchEl.value : '');

        if (moreNote) {
            const extra = (data.presence_count || 0) - discordWidgetMembers.length;
            moreNote.textContent = extra > 0 ? `+${extra} more online` : '';
        }

        if (data.instant_invite) {
            const code = data.instant_invite.split('/').pop();
            if (code) {
                fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`)
                    .then(r => r.ok ? r.json() : null)
                    .then(inv => {
                        if (!inv) return;
                        const totalEl = document.getElementById('discord-total-count');
                        if (totalEl && inv.approximate_member_count !== undefined) {
                            totalEl.textContent = inv.approximate_member_count;
                        }
                        const iconEl = document.getElementById('discord-server-icon');
                        if (iconEl && inv.guild && inv.guild.icon) {
                            const ext = inv.guild.icon.startsWith('a_') ? 'gif' : 'png';
                            iconEl.src = `https://cdn.discordapp.com/icons/${inv.guild.id}/${inv.guild.icon}.${ext}?size=128`;
                        }
                    })
                    .catch(() => {});
            }
        }
    } catch (e) {
        console.warn('Could not load Discord widget:', e);
        const grid = document.getElementById('discord-members-grid');
        if (grid) {
            grid.innerHTML = '<div class="discord-loading">Could not load Discord widget.</div>';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    EE();
    FF();
    setInterval(FF, 10000);

    const searchInput = document.getElementById('discord-member-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => renderDiscordMembersGrid(e.target.value));
    }
    loadDiscordWidget();
    setInterval(loadDiscordWidget, 60000);
});