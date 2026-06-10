const d = {
    "285061795029450754": "Francis",
    "1294114074002718771": "qx_444",
    "474567869519101953": "trevor",
    "1213158954197327932": "quer",
};

const r = {
    "1294114074002718771": "qx_444",
    "474567869519101953": "trevor",
};

const GG = t => ['Playing', 'Streaming', 'Listening to', 'Watching', 'Custom Status:', 'Competing in'][t] || 'Playing';

const UU = (i, m, s) => {
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


                return `<a href="${profileUrl}" ${clickHandler} class="trail-btn">
                <img src="${avatarUrl}" alt="${discord_user?.username || userName || 'User'}'s Avatar">
                ${discord_user?.username || userName || `User ID: ${userId}`}
                <span class="status ${discord_status}"></span>
                <div class="presence-popup">${activityHtml}</div>
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
                    <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="${userName || 'User'}'s Avatar">
                    ${userName || `User ID: ${userId}`}
                    <span class="status offline"></span>
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
    const dKeys = Object.keys(d);
    const rKeys = Object.keys(r);

    UU(dKeys, d, '.button-trail-left');
    UU(rKeys, r, '.button-trail-right');
};

const EE = () => {
    const b = document.getElementById('background-music');
    const t = document.getElementById('music-toggle');

    if (b) {
        b.volume = 0.5;
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

document.addEventListener('DOMContentLoaded', () => {
    EE();
    FF();
    setInterval(FF, 10000);
});